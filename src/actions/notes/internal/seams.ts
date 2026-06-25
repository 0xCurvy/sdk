import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import type { CurvyConfig } from "@/config/types";
import type { OwnershipMatch, OwnershipResolver } from "@/note/discoverOwnedNotes";
import type { LeafSource, RootVerifier, SyncedLeaf } from "@/note/notesTreeSync";
import type { LeafRangeSource } from "@/note/shardedNotesSync";
import type { EvmRpc } from "@/rpc";
import { poseidonHash } from "@/utils/hash/poseidonHash";

// ─────────────────────────────────────────────────────────────────────────────
// Production adapters for the sharded-sync seams. The engine
// (syncShardedNotesTree) is transport-agnostic; these bind it to the real
// surfaces: the indexer HTTP API (availability), a direct contract read
// (truth), and the account's stored balance entries (ownership).
// ─────────────────────────────────────────────────────────────────────────────

// The indexer serializes field elements as 0x-hex, but the rest of the SDK works
// in DECIMAL (Note ids, the ECDH ephemeral "x.y", balance-entry ids). Normalize at
// the boundary so the ownership ECDH (`coreOwnershipResolver`) and the integrity
// gate (`discoverOwnedNotes`' decimal `noteId` compare) see the shape they expect.
const toDecimal = (v: string): string => BigInt(v).toString();
const normalizeLeaf = (leaf: SyncedLeaf): SyncedLeaf => ({
  ...leaf,
  noteId: toDecimal(leaf.noteId),
  ephemeralKey: leaf.ephemeralKey
    ? [toDecimal(leaf.ephemeralKey[0]), toDecimal(leaf.ephemeralKey[1])]
    : leaf.ephemeralKey,
});

/** Drain both append-only indexer streams from the cursors into one delta. */
export function apiLeafSource(config: CurvyConfig, opts: { pageSize?: number } = {}): LeafSource {
  const pageSize = opts.pageSize ?? 500;
  return {
    async fetchDelta(cursor) {
      const leaves: SyncedLeaf[] = [];
      let from = cursor.leafCount;
      for (;;) {
        const page = await config.api.sync.GetNotes(from, pageSize);
        // Empty-page guard: a (possibly lying/lagging) indexer that returns no
        // rows while claiming total > from must not spin forever holding scanLock.
        if (page.notes.length === 0) break;
        leaves.push(...page.notes.map(normalizeLeaf));
        from = page.nextIndex;
        if (from >= page.total) break;
      }
      const nullifiers: string[] = [];
      let nullifierFrom = cursor.nullifierCount;
      for (;;) {
        const page = await config.api.sync.GetNullifiers(nullifierFrom, pageSize);
        if (page.nullifiers.length === 0) break;
        nullifiers.push(...page.nullifiers.map((n) => n.nullifier));
        nullifierFrom = page.nextIndex;
        if (nullifierFrom >= page.total) break;
      }
      const meta = await config.api.sync.GetMeta();
      return { leaves, nullifiers, blockNumber: meta.lastIndexedBlock };
    },
  };
}

/** Bounded range reads of the leaf stream — cold-note witness recovery. */
export function apiRangeSource(config: CurvyConfig, opts: { pageSize?: number } = {}): LeafRangeSource {
  const pageSize = opts.pageSize ?? 500;
  return {
    async fetchRange(fromIndex, count) {
      const out: SyncedLeaf[] = [];
      let from = fromIndex;
      while (out.length < count) {
        const page = await config.api.sync.GetNotes(from, Math.min(count - out.length, pageSize));
        if (page.notes.length === 0) break;
        out.push(...page.notes.map(normalizeLeaf));
        from = page.nextIndex;
      }
      return out;
    },
  };
}

const AGGREGATOR_READ_ABI = [
  {
    type: "function",
    name: "getCurrentNotesTreeRoot",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCurrentNoteIndex",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * The trust anchor: DIRECT chain reads of the aggregator, never the indexer.
 * A lying indexer cannot survive the sync's root-equality check against this.
 */
export function rpcRootVerifier(config: CurvyConfig, networkSlug: string): RootVerifier {
  return {
    async currentRoot() {
      const network = config.state.networks.find((n) => n.slug === networkSlug);
      const address = network?.aggregatorContractAddress;
      if (!address) throw new Error(`syncNotes: network ${networkSlug} has no aggregatorContractAddress`);
      const provider = (config.getRpc().Network(networkSlug) as EvmRpc).provider;
      const [root, noteIndex] = await Promise.all([
        provider.readContract({
          address: address as `0x${string}`,
          abi: AGGREGATOR_READ_ABI,
          functionName: "getCurrentNotesTreeRoot",
        }),
        provider.readContract({
          address: address as `0x${string}`,
          abi: AGGREGATOR_READ_ABI,
          functionName: "getCurrentNoteIndex",
        }),
      ]);
      return { root: root as bigint, noteIndex: Number(noteIndex as bigint) };
    },
  };
}

/**
 * Ownership resolver derived from the account's STORED balance entries — the
 * notes the existing scan path already discovered. No new cryptography: the
 * resolver only supplies (sharedSecret, ownerPub); `discoverOwnedNotes`' noteId
 * recompute remains the integrity gate. A WASM-Core per-leaf ECDH resolver can
 * replace this later to also discover notes the scan has never seen.
 */
export async function balanceOwnershipResolver(
  config: CurvyConfig,
  accountId: string,
  networkSlug: string,
): Promise<OwnershipResolver> {
  const entries = await config.storage.getBalances(accountId, config.state.environment);
  const byNoteId = new Map(
    entries
      .filter((e) => e.networkSlug === networkSlug)
      .map((e) => [
        e.id,
        {
          sharedSecret: BigInt(e.owner.sharedSecret),
          ownerPub: [BigInt(e.owner.babyJubjubPublicKey.x), BigInt(e.owner.babyJubjubPublicKey.y)] as [bigint, bigint],
        },
      ]),
  );
  return async (leaf) => byNoteId.get(leaf.noteId) ?? null;
}

/**
 * Production ownership resolver: local-ECDH note discovery via the WASM `Core`.
 * Trial-decrypts each delta leaf's ephemeral key against the account's (s, v)
 * keys — the SAME ownership step the legacy `noteScan` ran (`core.scanNotes` →
 * per-note `spendingPubKey`), minus the per-note backend round-trip. Unlike the
 * balance-derived resolver it discovers FIRST-TIME-seen notes (incoming
 * deposits/transfers), not just notes already in storage.
 *
 * The whole delta is trial-decrypted in ONE `scanNotes` via the `prescan` hook;
 * the per-leaf body is then a map lookup. Format bridge: a `SyncedLeaf` carries
 * `ephemeralKey: [x, y]` + a numeric `viewTag`, whereas the WASM scan wants the
 * V2 announcement shape — R as the packed "x.y" key and viewTag as zero-padded hex
 * (`viewTag.toString(16).padStart(2, "0")`), matching `Note.serializeOutputNote`'s deliveryTag.
 * `discoverOwnedNotes`' noteId recompute stays the integrity gate, so a wrong
 * (sharedSecret, ownerPub) can never survive into a balance entry.
 */
export function coreOwnershipResolver(config: CurvyConfig, accountId: string): OwnershipResolver {
  const { s, v, babyJubjubPublicKey } = getActiveKeyPairs(config, accountId);
  const [px, py] = babyJubjubPublicKey.split(".");
  const ownerPub: [bigint, bigint] = [BigInt(px), BigInt(py)];

  const matches = new Map<string, OwnershipMatch>();
  const resolver: OwnershipResolver = async (leaf) => matches.get(leaf.noteId) ?? null;

  resolver.prescan = async (leaves) => {
    matches.clear();
    const discoverable = leaves.filter(
      (l): l is SyncedLeaf & { ephemeralKey: [string, string] } => l.ephemeralKey !== undefined,
    );
    if (discoverable.length === 0) return;

    const { spendingPubKeys } = await config.core.scanNotes(
      s,
      v,
      discoverable.map((l) => ({
        ephemeralKey: `${l.ephemeralKey[0]}.${l.ephemeralKey[1]}`,
        // padStart: the Go-WASM scan slices viewTag[:2] — a 1-char hex tag
        // (e.g. "0" from zero/legacy tags) panics the whole batch.
        viewTag: (l.viewTag ?? 0).toString(16).padStart(2, "0"),
      })),
    );

    discoverable.forEach((leaf, i) => {
      const pub = spendingPubKeys[i];
      if (!pub || pub.length === 0) return; // empty spendingPubKey ⇒ not ours
      matches.set(leaf.noteId, { sharedSecret: BigInt(pub.split(".")[0]), ownerPub });
    });
  };

  return resolver;
}

/** `nullifier → noteId` for every owned note — multi-device spend reconciliation. */
export async function ownedNullifiersFromBalances(
  config: CurvyConfig,
  accountId: string,
  networkSlug: string,
): Promise<Map<bigint, bigint>> {
  const entries = await config.storage.getBalances(accountId, config.state.environment);
  const map = new Map<bigint, bigint>();
  for (const e of entries) {
    if (e.networkSlug !== networkSlug) continue;
    const nullifier = poseidonHash([
      BigInt(e.owner.sharedSecret),
      BigInt(e.owner.babyJubjubPublicKey.x),
      BigInt(e.owner.babyJubjubPublicKey.y),
    ]);
    map.set(nullifier, BigInt(e.id));
  }
  return map;
}

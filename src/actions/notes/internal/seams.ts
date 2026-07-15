import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import type { CurvyConfig } from "@/config/types";
import type { OwnershipMatch, OwnershipResolver } from "@/note/discoverOwnedNotes";
import type { FinalizedSyncCheckpoint, LeafSource, RootVerifier, SyncedLeaf } from "@/note/notesTreeSync";
import type { LeafRangeSource } from "@/note/shardedNotesSync";
import { DEFAULT_SHARD_HEIGHT } from "@/note/shardedNotesTree";
import { nullifier as rustNullifier } from "@/proving/rustCore";
import type { EvmRpc } from "@/rpc";

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

/**
 * Drain both append-only indexer streams from the cursors into one delta. Scoped
 * to `chainId`: the sync client routes to that chain's indexer and sends the id so
 * a lagging/misconfigured indexer can't answer with another chain's leaves.
 */
export function apiLeafSource(
  config: CurvyConfig,
  opts: { chainId: number; pageSize?: number; signal?: AbortSignal },
): LeafSource {
  const pageSize = opts.pageSize ?? 500;
  const { chainId, signal } = opts;
  return {
    async fetchDelta(cursor) {
      const meta = await config.api.sync.GetMeta(chainId);
      const network = config.state.networks.find((candidate) => Number(candidate.chainId) === chainId);
      const expectedContract = network?.aggregatorContractAddress?.toLowerCase();
      if (!expectedContract || meta.contractAddress.toLowerCase() !== expectedContract) {
        throw new Error(`sync checkpoint contract ${meta.contractAddress} does not match chain ${chainId}`);
      }
      if (meta.chainId !== chainId) throw new Error(`sync checkpoint chain ${meta.chainId} does not match ${chainId}`);
      if (meta.treeVersion !== 1) throw new Error(`unsupported sync tree version ${meta.treeVersion}`);
      if (meta.shardHeight !== DEFAULT_SHARD_HEIGHT || meta.shardSize !== 1 << DEFAULT_SHARD_HEIGHT) {
        throw new Error(`unsupported shard geometry h${meta.shardHeight}/${meta.shardSize}`);
      }
      if (meta.noteCount < cursor.leafCount || meta.nullifierCount < cursor.nullifierCount) {
        throw new Error(
          `sync checkpoint regressed below local cursors (${meta.noteCount}/${meta.nullifierCount} < ${cursor.leafCount}/${cursor.nullifierCount})`,
        );
      }

      const leaves: SyncedLeaf[] = [];
      let from = cursor.leafCount;
      while (from < meta.noteCount) {
        signal?.throwIfAborted();
        const page = await config.api.sync.GetNotes(chainId, from, pageSize, meta.checkpoint);
        assertPage(page, meta.checkpoint, from, meta.noteCount, page.notes.length, "notes");
        if (page.notes.length === 0) throw new Error(`sync notes stopped before checkpoint total ${meta.noteCount}`);
        leaves.push(...page.notes.map(normalizeLeaf));
        from = page.nextIndex;
      }
      const nullifiers: string[] = [];
      let nullifierFrom = cursor.nullifierCount;
      while (nullifierFrom < meta.nullifierCount) {
        signal?.throwIfAborted();
        const page = await config.api.sync.GetNullifiers(chainId, nullifierFrom, pageSize, meta.checkpoint);
        assertPage(page, meta.checkpoint, nullifierFrom, meta.nullifierCount, page.nullifiers.length, "nullifiers");
        if (page.nullifiers.length === 0) {
          throw new Error(`sync nullifiers stopped before checkpoint total ${meta.nullifierCount}`);
        }
        nullifiers.push(...page.nullifiers.map((n) => n.nullifier));
        nullifierFrom = page.nextIndex;
      }
      return {
        leaves,
        nullifiers,
        blockNumber: meta.finalizedBlockNumber,
        checkpoint: meta satisfies FinalizedSyncCheckpoint,
      };
    },
  };
}

function assertPage(
  page: { checkpoint: string; fromIndex: number; nextIndex: number; total: number },
  checkpoint: string,
  fromIndex: number,
  total: number,
  itemCount: number,
  label: string,
): void {
  if (page.checkpoint !== checkpoint) throw new Error(`sync ${label} page changed checkpoint`);
  if (page.fromIndex !== fromIndex)
    throw new Error(`sync ${label} page started at ${page.fromIndex}, expected ${fromIndex}`);
  if (page.total !== total) throw new Error(`sync ${label} page total ${page.total}, expected ${total}`);
  if (page.nextIndex !== fromIndex + itemCount) {
    throw new Error(`sync ${label} page next index ${page.nextIndex}, expected ${fromIndex + itemCount}`);
  }
}

/** Bounded range reads of the leaf stream — cold-note witness recovery. Chain-scoped. */
export function apiRangeSource(config: CurvyConfig, opts: { chainId: number; pageSize?: number }): LeafRangeSource {
  const pageSize = opts.pageSize ?? 500;
  const { chainId } = opts;
  return {
    async fetchRange(fromIndex, count) {
      const meta = await config.api.sync.GetMeta(chainId);
      if (fromIndex + count > meta.noteCount) {
        throw new Error(`requested leaf range ${fromIndex}..${fromIndex + count} exceeds checkpoint ${meta.noteCount}`);
      }
      const out: SyncedLeaf[] = [];
      let from = fromIndex;
      while (out.length < count) {
        const page = await config.api.sync.GetNotes(
          chainId,
          from,
          Math.min(count - out.length, pageSize),
          meta.checkpoint,
        );
        assertPage(page, meta.checkpoint, from, meta.noteCount, page.notes.length, "range");
        if (page.notes.length === 0) throw new Error("sync leaf range stopped before requested count");
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
    async currentRoot(checkpoint) {
      const network = config.state.networks.find((n) => n.slug === networkSlug);
      const address = network?.aggregatorContractAddress;
      if (!address) throw new Error(`syncNotes: network ${networkSlug} has no aggregatorContractAddress`);
      const provider = (config.getRpc().Network(networkSlug) as EvmRpc).provider;
      if (checkpoint && checkpoint.contractAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error(`checkpoint contract ${checkpoint.contractAddress} does not match ${address}`);
      }
      const blockNumber = checkpoint ? BigInt(checkpoint.finalizedBlockNumber) : undefined;
      const [root, noteIndex, block] = await Promise.all([
        provider.readContract({
          address: address as `0x${string}`,
          abi: AGGREGATOR_READ_ABI,
          functionName: "getCurrentNotesTreeRoot",
          ...(blockNumber !== undefined ? { blockNumber } : {}),
        }),
        provider.readContract({
          address: address as `0x${string}`,
          abi: AGGREGATOR_READ_ABI,
          functionName: "getCurrentNoteIndex",
          ...(blockNumber !== undefined ? { blockNumber } : {}),
        }),
        blockNumber !== undefined ? provider.getBlock({ blockNumber }) : Promise.resolve(null),
      ]);
      if (checkpoint && block?.hash !== checkpoint.finalizedBlockHash) {
        throw new Error(
          `checkpoint block hash ${checkpoint.finalizedBlockHash} does not match RPC ${block?.hash ?? "missing"}`,
        );
      }
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
 *
 * Intentional dead code: production sync uses {@link coreOwnershipResolver} (which
 * supersedes this); the stored-balance variant is retained as a documented
 * fallback and is currently exercised only by tests.
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
        ephemeralKey: `${BigInt(l.ephemeralKey[0])}.${BigInt(l.ephemeralKey[1])}`,
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
    const nullifier = rustNullifier(
      BigInt(e.owner.sharedSecret),
      BigInt(e.owner.babyJubjubPublicKey.x),
      BigInt(e.owner.babyJubjubPublicKey.y),
    );
    map.set(nullifier, BigInt(e.id));
  }
  return map;
}

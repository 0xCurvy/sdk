import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { StorageInterface } from "@/interfaces/storage";
import { MerkleTree } from "@/proving/merkleTree";

// ─────────────────────────────────────────────────────────────────────────────
// Notes-tree sync engine — keeps a network's GLOBAL notes tree current and
// durable, optimized for browser/IndexedDB. The bridge between the chunked
// committed logs in storage, the in-memory IMT proof generation needs, and the
// on-chain trust anchor. See plan-sdk-notetree-sync-and-storage.md.
//
// Strategy (the optimized browser path):
//   - committed leaf/nullifier logs are PUBLIC chain data, stored PLAINTEXT and
//     CHUNKED, so a delta sync rewrites only the tail chunk (not the whole log);
//   - the IMT is held warm in memory across the session and cold-rebuilt from the
//     chunked log via `MerkleTree.fromLeaves` (O(n) bulk build, not O(n·depth));
//   - the rebuilt root is verified against a DIRECT chain RPC read (`RootVerifier`),
//     never the indexer — the indexer is availability-only;
//   - the leaf/nullifier sources are SEAMS (`LeafSource`): an indexer client in
//     production, `eth_getLogs` as the trustless fallback, or in-memory in tests.
// ─────────────────────────────────────────────────────────────────────────────

/** A committed leaf as delivered by a `LeafSource` — id + (optional) delivery data. */
export type SyncedLeaf = {
  /** Slot in the on-chain notes tree (dense, gap-free — zeros already stripped). */
  index: number;
  noteId: string;
  /** Delivery metadata (present for discoverable notes; absent for bare leaves). */
  ephemeralKey?: [string, string];
  viewTag?: number;
  /** Encrypted (CTR field-OTP) or plaintext amount/token, per `isPlaintext`. */
  amount?: string;
  token?: string;
  isPlaintext?: boolean;
  /** Block of the announce tx — the user-action time (pairs with `requestTxHash`; tx history). */
  blockNumber?: number;
  /** The tx that announced the note (submitAggregation / autoShield) — user-action time (tx history). */
  requestTxHash?: string;
};

/** The delta a `LeafSource` returns from the client's cursors to the indexer head. */
export type SyncDelta = {
  leaves: SyncedLeaf[];
  nullifiers: string[];
  /** Chain block the source indexed up to. */
  blockNumber: number;
};

/** Append-only delta feed — an indexer client, `eth_getLogs`, or a test double. */
export interface LeafSource {
  fetchDelta(cursor: { leafCount: number; nullifierCount: number }): Promise<SyncDelta>;
}

/** The trust anchor: a DIRECT chain RPC read of the aggregator. Never the indexer. */
export interface RootVerifier {
  currentRoot(): Promise<{ root: bigint; noteIndex: number }>;
}

/** The in-memory working set rebuilt from / appended to the chunked logs. */
export type LiveNotesTree = {
  tree: MerkleTree;
  /** Ordered committed-leaf-id log (decimal strings) mirroring the tree. */
  leaves: string[];
  nullifiers: Set<bigint>;
};

const NOTES_TREE_DEPTH = 30;

/** Bulk-rebuild the working set from the persisted logs (O(n) hashes). */
export function rebuildNotesTree(leaves: string[], nullifiers: string[], depth = NOTES_TREE_DEPTH): LiveNotesTree {
  return {
    tree: MerkleTree.fromLeaves({ depth }, leaves.map(BigInt)),
    leaves: [...leaves],
    nullifiers: new Set(nullifiers.map(BigInt)),
  };
}

export type SyncNotesTreeOptions = {
  storage: StorageInterface;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  source: LeafSource;
  /** When provided, the rebuilt root is verified against chain once caught up. */
  verifier?: RootVerifier;
  depth?: number;
  /** Injected clock (defaults to Date.now); lets tests pin `lastSynced`. */
  now?: () => number;
};

export type SyncNotesTreeResult = {
  live: LiveNotesTree;
  /** The leaves appended this run (delivery data intact) — feed to discovery. */
  newLeaves: SyncedLeaf[];
  newNullifiers: bigint[];
  /**
   * True iff the LEAF stream is level with the chain head (rebuilt root ==
   * on-chain root at `noteIndex`). LEAF-STREAM ONLY: the nullifier stream has no
   * on-chain anchor (V2 stores nullifiers in a `mapping`, not a counted/rooted
   * tree — `RootVerifier` exposes only {root, noteIndex}), so it is trusted from
   * the indexer. A withheld nullifier only delays spend reconciliation; a forged
   * one can at worst unmark an owned note (self-correcting, funds-safe — spending
   * still needs a valid on-chain proof). So a spent-but-unreconciled note can
   * still read live while `caughtUp` is true.
   */
  caughtUp: boolean;
  /**
   * Leaf-count skew vs. the verifier's on-chain `noteIndex` when not caught up:
   * POSITIVE when the indexer/leaves are behind the chain head, NEGATIVE when the
   * one-shot chain read trails the indexer's leaf stream (transient replica lag
   * right after a commit), 0 when caught up.
   */
  indexerLag: number;
};

/**
 * Chain trust-anchor reconciliation, shared by the full and sharded sync engines.
 * When the local leaf count is level with the verifier's on-chain `noteIndex`,
 * the local root MUST equal the on-chain root — throws `<mismatchLabel> <local>
 * != on-chain root <chain>` on divergence (also what retroactively validates any
 * bootstrapped state). Otherwise it reports the SIGNED `indexerLag`:
 *   POSITIVE — the indexer/leaves trail the chain head.
 *   NEGATIVE — `verifier.currentRoot()` (a one-shot RPC read) landed on a replica
 *     a beat behind right after a commit, momentarily reporting a lower noteIndex
 *     than the leaves already delivered. NOT a lying indexer: stay not-caughtUp
 *     and let the next pass reconcile; the root-equality gate above still fires
 *     the moment the counts align, so a genuinely fabricated leaf fails it then.
 */
export async function reconcileWithChain(
  verifier: RootVerifier,
  leafCount: number,
  localRoot: () => bigint,
  mismatchLabel: string,
): Promise<{ caughtUp: boolean; indexerLag: number }> {
  const { root, noteIndex } = await verifier.currentRoot();
  if (leafCount === noteIndex) {
    const assembled = localRoot();
    if (assembled !== root) {
      throw new Error(`${mismatchLabel} ${assembled} != on-chain root ${root}`);
    }
    return { caughtUp: true, indexerLag: 0 };
  }
  return { caughtUp: false, indexerLag: noteIndex - leafCount };
}

/**
 * Run one sync pass for a network: rebuild the warm tree from the chunked logs,
 * pull the delta from `source` (cursor = persisted log lengths), fold it in,
 * verify against chain, and persist (only the tail chunk is rewritten). Returns
 * the live tree + the appended delta so the caller can run discovery (7.2) and
 * mark spends.
 */
export async function syncNotesTree(opts: SyncNotesTreeOptions): Promise<SyncNotesTreeResult> {
  const { storage, networkSlug, environment, source, verifier } = opts;
  const depth = opts.depth ?? NOTES_TREE_DEPTH;
  const now = opts.now ?? (() => Date.now());

  // 1. Rebuild the warm working set from the persisted chunked logs.
  const [leaves, nullifiers] = await Promise.all([
    storage.getCommittedLog(networkSlug, "leaf"),
    storage.getCommittedLog(networkSlug, "nullifier"),
  ]);
  const live = rebuildNotesTree(leaves, nullifiers, depth);
  const fromLeafCount = live.leaves.length;
  const fromNullifierCount = live.nullifiers.size;

  // 2. Pull the delta from the (untrusted) source, cursor = current log lengths.
  const delta = await source.fetchDelta({ leafCount: fromLeafCount, nullifierCount: fromNullifierCount });

  // 3. Apply leaves IN ORDER, asserting the stream is dense and gap-free (the
  //    leaf index IS the cursor — a gap means the source mis-stripped zeros).
  const newLeaves: SyncedLeaf[] = [];
  for (const leaf of delta.leaves) {
    if (leaf.index !== live.leaves.length) {
      throw new Error(`notes-tree sync: leaf gap — expected index ${live.leaves.length}, got ${leaf.index}`);
    }
    live.tree.insert(BigInt(leaf.noteId));
    live.leaves.push(leaf.noteId);
    newLeaves.push(leaf);
  }
  const newNullifiers = delta.nullifiers.map(BigInt);
  for (const nf of newNullifiers) live.nullifiers.add(nf);

  // 4. Verify against the chain (the trust anchor). When the indexer is caught
  //    up to the chain head, the rebuilt root MUST equal the on-chain root; if
  //    the indexer is behind, surface the lag instead of failing.
  let caughtUp = false;
  let indexerLag = 0;
  if (verifier) {
    ({ caughtUp, indexerLag } = await reconcileWithChain(
      verifier,
      live.leaves.length,
      () => live.tree.root(),
      "notes-tree sync: rebuilt root",
    ));
  }

  // 5. Persist: append only the tail (chunked) + rewrite the small checkpoint.
  if (newLeaves.length > 0) {
    await storage.appendCommittedLog(
      networkSlug,
      "leaf",
      fromLeafCount,
      newLeaves.map((l) => l.noteId),
    );
  }
  if (newNullifiers.length > 0) {
    await storage.appendCommittedLog(networkSlug, "nullifier", fromNullifierCount, delta.nullifiers);
  }
  await storage.putNotesCheckpoint({
    networkSlug,
    environment,
    leafCount: live.leaves.length,
    nullifierCount: live.nullifiers.size,
    root: live.tree.root().toString(),
    blockNumber: delta.blockNumber,
    lastSynced: now(),
  });

  return { live, newLeaves, newNullifiers, caughtUp, indexerLag };
}

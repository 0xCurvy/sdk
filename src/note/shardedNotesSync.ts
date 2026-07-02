import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { StorageInterface } from "@/interfaces/storage";
import { MerkleTree } from "@/proving/merkleTree";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import { discoverOwnedNotes, type OwnedNote, type OwnershipResolver } from "./discoverOwnedNotes";
import type { LeafSource, RootVerifier, SyncedLeaf } from "./notesTreeSync";
import { DEFAULT_SHARD_HEIGHT, NOTES_TREE_DEPTH, ShardedNotesTree } from "./shardedNotesTree";

// ─────────────────────────────────────────────────────────────────────────────
// Sharded notes-tree sync engine — the lean-profile counterpart of
// `syncNotesTree`. Same seams (LeafSource for deltas, RootVerifier as the chain
// trust anchor, chunked append-only persistence), different working set:
// instead of rebuilding and holding the FULL global IMT, it restores
// {shard roots + owned-note witnesses + live shard} — a few MB at any global
// tree size — and folds only the delta. See plan-shardtree-curvy.md.
//
// Ordering invariant: discovery runs BEFORE folding. A delta can complete
// several shards in one pass; marks must exist when a shard's rollover fires
// so the freeze captures the owned notes inside it.
// ─────────────────────────────────────────────────────────────────────────────

export type SyncShardedNotesTreeOptions = {
  storage: StorageInterface;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  source: LeafSource;
  /** When provided, the assembled root is verified against chain once caught up. */
  verifier?: RootVerifier;
  depth?: number;
  shardHeight?: number;
  /** Discovery hook — when provided, delta leaves are trial-matched and owned notes marked. */
  resolveOwnership?: OwnershipResolver;
  /** `nullifier → owned noteId` for spend reconciliation (notes spent on other devices). */
  ownedNullifiers?: Map<bigint, bigint>;
  /** Injected clock (defaults to Date.now); lets tests pin `lastSynced`. */
  now?: () => number;
};

export type SyncShardedNotesTreeResult = {
  tree: ShardedNotesTree;
  /** The leaves appended this run (delivery data intact). */
  newLeaves: SyncedLeaf[];
  /** Owned notes discovered in this delta (already marked in the tree). */
  newOwned: OwnedNote[];
  newNullifiers: bigint[];
  /** Owned notes whose nullifiers appeared this run (unmarked + witness deleted). */
  spentNoteIds: bigint[];
  /**
   * True iff the LEAF stream is level with the chain head (assembled root ==
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
 * Run one sharded sync pass: restore the small persisted state (never a global
 * rebuild), pull the delta, discover → mark → fold, reconcile spends, verify
 * the assembled root against chain, persist the delta (append-only shard
 * roots, rewritten live shard, touched witnesses, checkpoint).
 */
export async function syncShardedNotesTree(opts: SyncShardedNotesTreeOptions): Promise<SyncShardedNotesTreeResult> {
  const { storage, networkSlug, environment, source, verifier } = opts;
  const depth = opts.depth ?? NOTES_TREE_DEPTH;
  const shardHeight = opts.shardHeight ?? DEFAULT_SHARD_HEIGHT;
  const now = opts.now ?? (() => Date.now());

  // 1. Restore the working set from storage — O(live shard), not O(n).
  const [shardRoots, liveShard, witnesses, fromNullifierCount] = await Promise.all([
    storage.getShardRoots(networkSlug),
    storage.getLiveShard(networkSlug),
    storage.getNoteWitnesses(networkSlug),
    storage.getCommittedLogCount(networkSlug, "nullifier"),
  ]);
  const tree = ShardedNotesTree.fromSnapshot({
    depth,
    shardHeight,
    shardRoots,
    liveLeaves: liveShard?.leaves ?? [],
    witnesses: witnesses.map((w) => ({
      noteId: w.noteId,
      leafIndex: w.leafIndex,
      withinShardSiblings: w.withinShardSiblings,
    })),
  });
  tree.drainDirtyWitnesses(); // restored state is already persisted — start clean
  const shardCountBefore = tree.shardCount;

  // 2. Pull the delta from the (untrusted) source; cursor = restored counts.
  const delta = await source.fetchDelta({ leafCount: tree.leafCount, nullifierCount: fromNullifierCount });

  // 3. Discover owned notes in the delta FIRST (marks must precede rollovers),
  //    then fold the leaves in order, asserting the stream is dense.
  const newOwned = opts.resolveOwnership ? await discoverOwnedNotes(delta.leaves, opts.resolveOwnership) : [];
  for (const note of newOwned) tree.mark(BigInt(note.noteId), note.leafIndex);

  const newLeaves: SyncedLeaf[] = [];
  for (const leaf of delta.leaves) {
    if (leaf.index !== tree.leafCount) {
      throw new Error(`sharded sync: leaf gap — expected index ${tree.leafCount}, got ${leaf.index}`);
    }
    tree.append(BigInt(leaf.noteId));
    newLeaves.push(leaf);
  }

  // 4. Spend reconciliation: any owned note whose nullifier shows up in the
  //    delta was spent (possibly on another device, OR received-and-spent in
  //    THIS same window). The reconciliation lookup is the pre-sync stored set
  //    PLUS the notes just discovered above — without folding `newOwned` in, a
  //    note minted and spent inside one delta would be added as a balance entry
  //    that is never reconciled away (phantom live balance).
  const ownedNullifiers = new Map(opts.ownedNullifiers ?? []);
  for (const note of newOwned) {
    ownedNullifiers.set(poseidonHash([note.sharedSecret, note.ownerPub[0], note.ownerPub[1]]), BigInt(note.noteId));
  }
  const newNullifiers = delta.nullifiers.map(BigInt);
  const spentNoteIds: bigint[] = [];
  for (const nf of newNullifiers) {
    const noteId = ownedNullifiers.get(nf);
    if (noteId === undefined) continue;
    if (tree.hasWitness(noteId)) tree.unmark(noteId);
    spentNoteIds.push(noteId);
  }

  // 5. Trust anchor: the assembled (cap + live frontier) root MUST equal the
  //    chain's when level with it; surface lag when the indexer is behind.
  //    This is also what retroactively validates bootstrapped shard roots.
  let caughtUp = false;
  let indexerLag = 0;
  if (verifier) {
    const { root, noteIndex } = await verifier.currentRoot();
    if (tree.leafCount === noteIndex) {
      if (tree.root() !== root) {
        throw new Error(`sharded sync: assembled root ${tree.root()} != on-chain root ${root}`);
      }
      caughtUp = true;
    } else if (tree.leafCount < noteIndex) {
      indexerLag = noteIndex - tree.leafCount;
    } else {
      // My chain read trails the indexer's leaf stream — the benign mirror of
      // indexerLag. The leaf source (indexer) polls continuously and sits at head,
      // while `verifier.currentRoot()` is a one-shot RPC read that can land on a
      // replica a beat behind right after a commit, so it momentarily reports a
      // lower noteIndex than the leaves already delivered. This is NOT a lying
      // indexer: stay not-caughtUp (negative lag = leaves ahead of my RPC read)
      // and let the next pass reconcile. The root-equality gate above still fires
      // the moment the counts align — a genuinely fabricated leaf fails it then.
      indexerLag = noteIndex - tree.leafCount;
    }
  }

  // 6. Persist the delta: append-only shard roots, the (bounded) live shard,
  //    witnesses touched this run, the nullifier log tail, the checkpoint.
  const snapshot = tree.snapshot();
  if (snapshot.shardRoots.length > shardCountBefore) {
    await storage.appendShardRoots(networkSlug, shardCountBefore, snapshot.shardRoots.slice(shardCountBefore));
  }
  await storage.putLiveShard({
    networkSlug,
    startIndex: tree.leafCount - snapshot.liveLeaves.length,
    leaves: snapshot.liveLeaves,
  });
  for (const w of tree.drainDirtyWitnesses()) {
    await storage.putNoteWitness({
      networkSlug,
      noteId: w.noteId.toString(),
      leafIndex: w.leafIndex,
      shardIndex: w.shardIndex,
      withinShardSiblings: w.withinShardSiblings?.map(String) ?? null,
    });
  }
  for (const noteId of spentNoteIds) await storage.deleteNoteWitness(networkSlug, noteId.toString());
  if (delta.nullifiers.length > 0) {
    await storage.appendCommittedLog(networkSlug, "nullifier", fromNullifierCount, delta.nullifiers);
  }
  await storage.putNotesCheckpoint({
    networkSlug,
    environment,
    leafCount: tree.leafCount,
    nullifierCount: fromNullifierCount + newNullifiers.length,
    root: tree.root().toString(),
    blockNumber: delta.blockNumber,
    lastSynced: now(),
    shardCount: tree.shardCount,
  });

  return { tree, newLeaves, newOwned, newNullifiers, spentNoteIds, caughtUp, indexerLag };
}

/** A bounded range read of the committed leaf stream (the existing dumb feed). */
export interface LeafRangeSource {
  /** `count` committed leaves starting at global `fromIndex`, in tree order. */
  fetchRange(fromIndex: number, count: number): Promise<SyncedLeaf[]>;
}

/**
 * Cold-note recovery: build the frozen within-shard witness for a note in an
 * already-completed shard whose path was never captured (restored wallet,
 * deleted witness). Fetches ONE shard's leaves from the dumb leaf feed and
 * rebuilds the shard locally — no smart indexer involved. Trust gate: the
 * rebuilt shard must reproduce the already-chain-verified shard root
 * (enforced inside `adoptFrozenWitness`), so a lying source is caught.
 */
export async function recoverWitness(
  tree: ShardedNotesTree,
  source: LeafRangeSource,
  noteId: bigint,
  leafIndex: number,
): Promise<void> {
  const shardIndex = leafIndex >> tree.shardHeight;
  const start = shardIndex * tree.shardSize;
  const leaves = await source.fetchRange(start, tree.shardSize);
  if (leaves.length !== tree.shardSize) {
    throw new Error(
      `witness recovery: expected ${tree.shardSize} leaves for shard ${shardIndex}, got ${leaves.length}`,
    );
  }
  leaves.forEach((leaf, i) => {
    if (leaf.index !== start + i) {
      throw new Error(`witness recovery: leaf range gap — expected index ${start + i}, got ${leaf.index}`);
    }
  });
  const shard = MerkleTree.fromLeaves(
    { depth: tree.shardHeight },
    leaves.map((l) => BigInt(l.noteId)),
  );
  tree.adoptFrozenWitness(noteId, leafIndex, shard.createInclusionProof(noteId).siblings);
}

/**
 * Birthday bootstrap: seed a FRESH wallet's shard-root log without ever
 * downloading the leaf history (keys created now cannot own older notes).
 * The roots come from an untrusted indexer — they are validated by the first
 * sync's root check against the chain (step 5 above), which fails loudly on
 * any forged root.
 */
export async function bootstrapShardRoots(
  storage: StorageInterface,
  networkSlug: string,
  shardRoots: string[],
): Promise<void> {
  const existing = await storage.getShardRoots(networkSlug);
  if (existing.length > 0) {
    throw new Error(`bootstrap: ${existing.length} shard roots already present for ${networkSlug} — refusing to seed`);
  }
  await storage.appendShardRoots(networkSlug, 0, shardRoots);
}

import { poseidon2 } from "poseidon-lite";
import { type InclusionProof, MerkleTree, SNARK_SCALAR_FIELD } from "@/proving/merkleTree";
import type { NotesTreeView } from "./notesTreeView";

// ─────────────────────────────────────────────────────────────────────────────
// Sharded notes tree — the lean-client replacement for holding the full global
// IMT in memory. The depth-30 tree is cut at `shardHeight`:
//
//   - everything BELOW the cut lives in fixed 2^shardHeight-leaf shards; a
//     completed shard is frozen forever (the tree only appends), so an owned
//     note's within-shard siblings are computed ONCE at shard completion and
//     never change again;
//   - everything ABOVE the cut is the "cap": a tiny tree whose leaves are the
//     completed-shard roots (one 32-byte value per 2^shardHeight notes). The
//     cap is shared by every witness, so notes from arbitrarily distant leaf
//     indices always prove against the same root — multi-note aggregation
//     across eras is structural, not a refresh protocol;
//   - only the rightmost (live) shard ever mutates. It is a plain depth-
//     `shardHeight` MerkleTree, bounded at 2^shardHeight leaves no matter how
//     large the global tree grows.
//
// The decomposition is exact: with zero-padding, a shard root IS the flat
// tree's level-`shardHeight` node for that region, so root() equals
// `MerkleTree.fromLeaves({depth}, allLeaves).root()` bit for bit (the
// equivalence property test in shardedNotesTree.test.ts).
//
// Witness output is the existing 30-sibling `InclusionProof` — circuits,
// contracts and witness builders are untouched. See plan-shardtree-curvy.md.
//
// NOT maintained here: global leaf-uniqueness. The flat MerkleTree throws on
// duplicate leaves via its reverse index; a sharded tree would need an O(n)
// id set to do the same, which defeats the lean profile. Note-id uniqueness
// is the protocol's on-chain invariant, not this structure's.
// ─────────────────────────────────────────────────────────────────────────────

export const NOTES_TREE_DEPTH = 30;
export const DEFAULT_SHARD_HEIGHT = 14;

const hash2 = (l: bigint, r: bigint): bigint => poseidon2([l, r]) % SNARK_SCALAR_FIELD;

/** Witness state for one owned (marked) note. */
export type NoteWitness = {
  noteId: bigint;
  /** Global slot in the notes tree; low `shardHeight` bits = within-shard position. */
  leafIndex: number;
  /** `leafIndex >> shardHeight`. */
  shardIndex: number;
  /**
   * The `shardHeight` within-shard siblings. `null` while the note's shard is
   * live (derived on demand from the live tree); set exactly once when the
   * shard completes and immutable forever after (frozen-left).
   */
  withinShardSiblings: bigint[] | null;
};

/** JSON-safe witness snapshot (network association is the storage layer's job). */
export type NoteWitnessSnapshot = {
  noteId: string;
  leafIndex: number;
  withinShardSiblings: string[] | null;
};

/** The full serializable state — a few MB at any global tree size. */
export type ShardedTreeSnapshot = {
  depth: number;
  shardHeight: number;
  shardRoots: string[];
  liveLeaves: string[];
  witnesses: NoteWitnessSnapshot[];
};

export type ShardedNotesTreeParams = {
  depth?: number;
  shardHeight?: number;
};

export class ShardedNotesTree implements NotesTreeView {
  readonly depth: number;
  readonly shardHeight: number;
  readonly shardSize: number;
  private readonly capDepth: number;
  /** Z[h] = root of an all-empty subtree of height h (Z[0] = the IMT zero leaf). */
  private readonly Z: bigint[];

  /** Roots of COMPLETED shards, in shard order — the cap's leaves. */
  private shardRoots: bigint[] = [];
  /** The single mutable shard. */
  private live: MerkleTree;
  /** Mirror of the live shard's leaves (persistence + rollover bookkeeping). */
  private liveLeaves: bigint[] = [];
  /** Witness state per owned note id. */
  private witnesses = new Map<bigint, NoteWitness>();
  /** Witnesses created/frozen since the last drain — the sync's persistence set. */
  private dirty = new Set<bigint>();
  /** Cap levels memo — valid until the next append. */
  private capMemo: bigint[][] | null = null;

  constructor(params?: ShardedNotesTreeParams) {
    this.depth = params?.depth ?? NOTES_TREE_DEPTH;
    this.shardHeight = params?.shardHeight ?? DEFAULT_SHARD_HEIGHT;
    if (!Number.isInteger(this.shardHeight) || this.shardHeight <= 0 || this.shardHeight >= this.depth) {
      throw new Error(`sharded tree: shardHeight must be an integer in (0, depth); got ${this.shardHeight}`);
    }
    this.shardSize = 1 << this.shardHeight;
    this.capDepth = this.depth - this.shardHeight;
    this.Z = [0n];
    for (let h = 1; h <= this.depth; h++) this.Z.push(hash2(this.Z[h - 1], this.Z[h - 1]));
    this.live = new MerkleTree({ depth: this.shardHeight });
  }

  /** Restore from a snapshot — bulk-rebuilds ONLY the live shard (O(2^shardHeight) max). */
  static fromSnapshot(snapshot: ShardedTreeSnapshot): ShardedNotesTree {
    const tree = new ShardedNotesTree({ depth: snapshot.depth, shardHeight: snapshot.shardHeight });
    tree.shardRoots = snapshot.shardRoots.map(BigInt);
    tree.liveLeaves = snapshot.liveLeaves.map(BigInt);
    tree.live = MerkleTree.fromLeaves({ depth: tree.shardHeight }, tree.liveLeaves);
    for (const w of snapshot.witnesses) {
      const shardIndex = w.leafIndex >> tree.shardHeight;
      if (shardIndex < tree.shardRoots.length && w.withinShardSiblings === null) {
        throw new Error(
          `sharded tree: snapshot witness for note ${w.noteId} is in completed shard ${shardIndex} but has no frozen siblings`,
        );
      }
      tree.witnesses.set(BigInt(w.noteId), {
        noteId: BigInt(w.noteId),
        leafIndex: w.leafIndex,
        shardIndex,
        withinShardSiblings: w.withinShardSiblings?.map(BigInt) ?? null,
      });
    }
    return tree;
  }

  get leafCount(): number {
    return this.shardRoots.length * this.shardSize + this.liveLeaves.length;
  }

  get shardCount(): number {
    return this.shardRoots.length;
  }

  get witnessCount(): number {
    return this.witnesses.size;
  }

  shardRootAt(shardIndex: number): bigint {
    if (shardIndex < 0 || shardIndex >= this.shardRoots.length) {
      throw new Error(`sharded tree: shard ${shardIndex} is not completed (have ${this.shardRoots.length})`);
    }
    return this.shardRoots[shardIndex];
  }

  hasWitness(noteId: bigint): boolean {
    return this.witnesses.has(noteId);
  }

  /** Fold one committed leaf. O(shardHeight) hashes; rollover is amortized free. */
  append(noteId: bigint): void {
    if (this.leafCount >= 2 ** this.depth) throw new Error("sharded tree: tree is full");
    this.live.insert(noteId);
    this.liveLeaves.push(noteId);
    this.capMemo = null;
    if (this.liveLeaves.length === this.shardSize) this.rollOver();
  }

  appendMany(noteIds: bigint[]): void {
    for (const id of noteIds) this.append(id);
  }

  /**
   * The live shard just completed: freeze the within-shard path of every owned
   * note inside it (immutable forever — frozen-left), bank the shard root as a
   * cap leaf, and start a fresh live shard.
   */
  private rollOver(): void {
    const completedIndex = this.shardRoots.length;
    for (const w of this.witnesses.values()) {
      if (w.shardIndex !== completedIndex || w.withinShardSiblings !== null) continue;
      const withinIndex = this.live.getIndex(w.noteId);
      if (withinIndex === null || withinIndex !== (w.leafIndex & (this.shardSize - 1))) {
        throw new Error(
          `sharded tree: marked note ${w.noteId} expected at slot ${w.leafIndex & (this.shardSize - 1)} of shard ${completedIndex}, found ${withinIndex}`,
        );
      }
      w.withinShardSiblings = this.live.createInclusionProof(w.noteId).siblings;
      this.dirty.add(w.noteId);
    }
    this.shardRoots.push(this.live.root());
    this.live = new MerkleTree({ depth: this.shardHeight });
    this.liveLeaves = [];
  }

  /**
   * Track an owned note discovered in the live-or-future region (i.e. during a
   * normal forward sync, BEFORE its leaf is folded or while its shard is still
   * live). For notes in already-completed shards use {@link adoptFrozenWitness}.
   */
  mark(noteId: bigint, leafIndex: number): void {
    const shardIndex = leafIndex >> this.shardHeight;
    if (shardIndex < this.shardRoots.length) {
      throw new Error(
        `sharded tree: leaf ${leafIndex} is in completed shard ${shardIndex} — recover its frozen siblings and adoptFrozenWitness`,
      );
    }
    this.witnesses.set(noteId, { noteId, leafIndex, shardIndex, withinShardSiblings: null });
    this.dirty.add(noteId);
  }

  /** Stop tracking a note (it was spent — its nullifier appeared in the sync). */
  unmark(noteId: bigint): void {
    this.witnesses.delete(noteId);
    this.dirty.delete(noteId);
  }

  /**
   * Adopt an externally recovered witness for a note in a COMPLETED shard
   * (cold-note recovery — see recoverWitness in shardedNotesSync). The supplied
   * siblings are verified against the already-trusted shard root before being
   * accepted, so a lying leaf source is caught here.
   */
  adoptFrozenWitness(noteId: bigint, leafIndex: number, withinShardSiblings: bigint[]): void {
    const shardIndex = leafIndex >> this.shardHeight;
    if (shardIndex >= this.shardRoots.length) {
      throw new Error(`sharded tree: shard ${shardIndex} is not completed — use mark() for the live region`);
    }
    if (withinShardSiblings.length !== this.shardHeight) {
      throw new Error(
        `sharded tree: expected ${this.shardHeight} within-shard siblings, got ${withinShardSiblings.length}`,
      );
    }
    let node = noteId;
    let idx = leafIndex & (this.shardSize - 1);
    for (const sibling of withinShardSiblings) {
      node = idx % 2 === 1 ? hash2(sibling, node) : hash2(node, sibling);
      idx >>= 1;
    }
    if (node !== this.shardRoots[shardIndex]) {
      throw new Error(`sharded tree: recovered siblings for note ${noteId} do not hash to shard ${shardIndex}'s root`);
    }
    this.witnesses.set(noteId, { noteId, leafIndex, shardIndex, withinShardSiblings: [...withinShardSiblings] });
    this.dirty.add(noteId);
  }

  /** Dense cap levels: level 0 = shard roots (+ live partial root), top = global root. */
  private capLevels(): bigint[][] {
    if (this.capMemo) return this.capMemo;
    let level: bigint[] = this.liveLeaves.length > 0 ? [...this.shardRoots, this.live.root()] : [...this.shardRoots];
    const levels: bigint[][] = [level];
    for (let h = this.shardHeight; h < this.depth; h++) {
      const next: bigint[] = [];
      for (let i = 0; i < level.length; i += 2) {
        next.push(hash2(level[i], i + 1 < level.length ? level[i + 1] : this.Z[h]));
      }
      levels.push(next);
      level = next;
    }
    this.capMemo = levels;
    return levels;
  }

  /** The global root — equals the flat IMT's root over the same leaves. */
  root(): bigint {
    const top = this.capLevels()[this.capDepth];
    return top.length > 0 ? top[0] : this.Z[this.depth];
  }

  /**
   * Full inclusion proof for a marked note: the frozen (or live-derived)
   * within-shard siblings glued to the shared cap path. Output shape is the
   * standard `InclusionProof` — exactly what the witness builders consume.
   * All witnesses share the cap, hence the same `root` — K notes from K
   * different eras satisfy the circuit's single `notesRoot` by construction.
   */
  witness(noteId: bigint): InclusionProof {
    const w = this.witnesses.get(noteId);
    if (!w) throw new Error(`sharded tree: note ${noteId} is not marked`);

    let within: bigint[];
    if (w.withinShardSiblings !== null) {
      within = w.withinShardSiblings;
    } else {
      const withinIndex = this.live.getIndex(noteId);
      if (w.shardIndex !== this.shardRoots.length || withinIndex === null) {
        throw new Error(`sharded tree: note ${noteId} (leaf ${w.leafIndex}) is not yet folded into the tree`);
      }
      if (withinIndex !== (w.leafIndex & (this.shardSize - 1))) {
        throw new Error(
          `sharded tree: note ${noteId} expected at live slot ${w.leafIndex & (this.shardSize - 1)}, found ${withinIndex}`,
        );
      }
      within = this.live.createInclusionProof(noteId).siblings;
    }

    const levels = this.capLevels();
    const capSiblings: bigint[] = [];
    let idx = w.shardIndex;
    for (let k = 0; k < this.capDepth; k++) {
      const row = levels[k];
      const sibling = idx ^ 1;
      capSiblings.push(sibling < row.length ? row[sibling] : this.Z[this.shardHeight + k]);
      idx >>= 1;
    }

    return { leaf: noteId, index: w.leafIndex, siblings: [...within, ...capSiblings], root: this.root() };
  }

  /** Witnesses created or frozen since the last drain — what the sync persists. */
  drainDirtyWitnesses(): NoteWitness[] {
    const out: NoteWitness[] = [];
    for (const id of this.dirty) {
      const w = this.witnesses.get(id);
      if (w) out.push(w);
    }
    this.dirty.clear();
    return out;
  }

  snapshot(): ShardedTreeSnapshot {
    return {
      depth: this.depth,
      shardHeight: this.shardHeight,
      shardRoots: this.shardRoots.map(String),
      liveLeaves: this.liveLeaves.map(String),
      witnesses: [...this.witnesses.values()].map((w) => ({
        noteId: w.noteId.toString(),
        leafIndex: w.leafIndex,
        withinShardSiblings: w.withinShardSiblings?.map(String) ?? null,
      })),
    };
  }
}

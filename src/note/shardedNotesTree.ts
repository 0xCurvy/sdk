import type { InclusionProof } from "@/proving/merkleTree";
import {
  bytesToField,
  bytesToFields,
  createRustShardedNotesTree,
  fieldsToBytes,
  fieldToBytes,
  type RustShardedNotesTree,
  restoreRustShardedNotesTreeParts,
} from "@/proving/rustCore";
import type { NotesTreeView } from "./notesTreeView";

export const NOTES_TREE_DEPTH = 30;
export const DEFAULT_SHARD_HEIGHT = 14;

/** Witness state for one owned (marked) note. */
export type NoteWitness = {
  noteId: bigint;
  /** Global slot in the notes tree; low `shardHeight` bits = within-shard position. */
  leafIndex: number;
  /** `leafIndex >> shardHeight`. */
  shardIndex: number;
  /** Frozen within-shard siblings, or `null` while the note's shard is live. */
  withinShardSiblings: bigint[] | null;
};

/** JSON-safe witness snapshot (network association is the storage layer's job). */
export type NoteWitnessSnapshot = {
  noteId: string;
  leafIndex: number;
  withinShardSiblings: string[] | null;
};

/** The storage-facing state. Rust's opaque snapshot remains available internally. */
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

type RustOwnedWitness = ReturnType<RustShardedNotesTree["ownedNotes"]>[number];

function readOwnedWitness(raw: RustOwnedWitness, shardHeight: number): NoteWitness {
  const noteId = bytesToField(raw.noteId);
  return {
    noteId,
    leafIndex: raw.leafIndex,
    shardIndex: raw.leafIndex >> shardHeight,
    withinShardSiblings: raw.frozen ? bytesToFields(raw.withinShardSiblings) : null,
  };
}

/**
 * Lean depth-30 notes tree backed entirely by the Rust/WASM core.
 *
 * TypeScript owns only application/storage adaptation. Poseidon, live-shard
 * mutation, cap updates, rollover freezing, cold-witness validation, snapshot
 * integrity, and full witness assembly all execute in Rust.
 */
export class ShardedNotesTree implements NotesTreeView {
  readonly depth: number;
  readonly shardHeight: number;
  readonly shardSize: number;

  private inner: RustShardedNotesTree;
  private readonly witnessIndices = new Map<bigint, number>();

  constructor(params?: ShardedNotesTreeParams) {
    this.depth = params?.depth ?? NOTES_TREE_DEPTH;
    this.shardHeight = params?.shardHeight ?? DEFAULT_SHARD_HEIGHT;
    this.inner = createRustShardedNotesTree(this.depth, this.shardHeight);
    this.shardSize = this.inner.shardSize;
  }

  /** Restore split storage tables without re-hashing completed shards. */
  static fromSnapshot(snapshot: ShardedTreeSnapshot): ShardedNotesTree {
    for (const witness of snapshot.witnesses) {
      const shardIndex = witness.leafIndex >> snapshot.shardHeight;
      if (shardIndex < snapshot.shardRoots.length && witness.withinShardSiblings === null) {
        throw new Error(
          `sharded tree: snapshot witness for note ${witness.noteId} is in completed shard ${shardIndex} but has no frozen siblings`,
        );
      }
    }

    const tree = new ShardedNotesTree({ depth: snapshot.depth, shardHeight: snapshot.shardHeight });
    const restored = restoreRustShardedNotesTreeParts(
      snapshot.depth,
      snapshot.shardHeight,
      snapshot.shardRoots.map(BigInt),
      snapshot.liveLeaves.map(BigInt),
    );
    tree.inner.free();
    tree.inner = restored;

    try {
      for (const witness of snapshot.witnesses) {
        const noteId = BigInt(witness.noteId);
        if (witness.withinShardSiblings === null) {
          tree.mark(noteId, witness.leafIndex);
        } else {
          tree.adoptFrozenWitness(noteId, witness.leafIndex, witness.withinShardSiblings.map(BigInt));
        }
      }
      tree.drainDirtyWitnesses();
      return tree;
    } catch (error) {
      tree.inner.free();
      throw error;
    }
  }

  get leafCount(): number {
    return this.inner.leafCount;
  }

  get shardCount(): number {
    return this.inner.completedShardCount;
  }

  get witnessCount(): number {
    return this.inner.ownedNoteCount;
  }

  shardRootAt(shardIndex: number): bigint {
    return bytesToField(this.inner.completedShardRoot(shardIndex));
  }

  hasWitness(noteId: bigint): boolean {
    return this.witnessIndices.has(noteId);
  }

  append(noteId: bigint): void {
    this.inner.append(fieldToBytes(noteId));
  }

  appendMany(noteIds: bigint[]): void {
    this.inner.appendMany(fieldsToBytes(noteIds));
  }

  mark(noteId: bigint, leafIndex: number): void {
    const shardIndex = leafIndex >> this.shardHeight;
    if (shardIndex < this.shardCount) {
      throw new Error(
        `sharded tree: leaf ${leafIndex} is in completed shard ${shardIndex} — recover its frozen siblings and adoptFrozenWitness`,
      );
    }
    this.inner.markOwned(fieldToBytes(noteId), leafIndex);
    this.witnessIndices.set(noteId, leafIndex);
  }

  unmark(noteId: bigint): void {
    this.inner.unmarkOwned(fieldToBytes(noteId));
    this.witnessIndices.delete(noteId);
  }

  adoptFrozenWitness(noteId: bigint, leafIndex: number, withinShardSiblings: bigint[]): void {
    try {
      this.inner.adoptFrozenWitness(fieldToBytes(noteId), leafIndex, fieldsToBytes(withinShardSiblings));
    } catch (error) {
      if (error instanceof Error && error.message.includes("witness does not hash to shard")) {
        const shardIndex = leafIndex >> this.shardHeight;
        throw new Error(
          `sharded tree: recovered siblings for note ${noteId} do not hash to shard ${shardIndex}'s root`,
          { cause: error },
        );
      }
      throw error;
    }
    this.witnessIndices.set(noteId, leafIndex);
  }

  root(): bigint {
    return bytesToField(this.inner.root());
  }

  witness(noteId: bigint): InclusionProof {
    const leafIndex = this.witnessIndices.get(noteId);
    if (leafIndex === undefined) throw new Error(`sharded tree: note ${noteId} is not marked`);
    if (leafIndex >= this.leafCount) {
      throw new Error(`sharded tree: note ${noteId} (leaf ${leafIndex}) is not yet folded into the tree`);
    }
    const raw = this.inner.witness(fieldToBytes(noteId));
    try {
      return {
        leaf: bytesToField(raw.leaf),
        index: raw.index,
        siblings: bytesToFields(raw.siblings),
        root: bytesToField(raw.root),
      };
    } finally {
      raw.free();
    }
  }

  /** Witnesses created or frozen since the last drain. */
  drainDirtyWitnesses(): NoteWitness[] {
    return this.inner.drainDirtyOwnedNotes().map((raw) => {
      try {
        return readOwnedWitness(raw, this.shardHeight);
      } finally {
        raw.free();
      }
    });
  }

  snapshot(): ShardedTreeSnapshot {
    const witnesses = this.inner.ownedNotes().map((raw): NoteWitnessSnapshot => {
      try {
        const witness = readOwnedWitness(raw, this.shardHeight);
        return {
          noteId: witness.noteId.toString(),
          leafIndex: witness.leafIndex,
          withinShardSiblings: witness.withinShardSiblings?.map(String) ?? null,
        };
      } finally {
        raw.free();
      }
    });

    return {
      depth: this.depth,
      shardHeight: this.shardHeight,
      shardRoots: bytesToFields(this.inner.completedShardRoots()).map(String),
      liveLeaves: bytesToFields(this.inner.liveLeaves()).map(String),
      witnesses,
    };
  }
}

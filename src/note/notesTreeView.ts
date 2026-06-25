import type { InclusionProof } from "@/proving/merkleTree";
import type { LiveNotesTree } from "./notesTreeSync";

// ─────────────────────────────────────────────────────────────────────────────
// The spend-side read surface shared by BOTH notes-sync engines, so the spend
// path (`getSpendWitnesses`) stays engine-agnostic and the consumer's
// `notesSyncEngine` choice picks the implementation:
//   - "sharded" → `ShardedNotesTree` (lean: shard roots + tracked witnesses)
//   - "global"  → `GlobalNotesTree`  (the full in-memory IMT)
// Both emit the identical 30-sibling `InclusionProof`, so witness builders,
// circuits, and contracts are untouched either way.
// ─────────────────────────────────────────────────────────────────────────────

export interface NotesTreeView {
  /** The global notes-tree root (equal for both engines over the same leaves). */
  root(): bigint;
  readonly leafCount: number;
  /** Can this tree produce an inclusion proof for `noteId` right now? */
  hasWitness(noteId: bigint): boolean;
  /** The full inclusion proof — the shape the witness builders consume. */
  witness(noteId: bigint): InclusionProof;
}

/**
 * `NotesTreeView` over the full in-memory IMT held by the global engine
 * (`syncNotesTree`). Every committed leaf lives in the warm tree, so any leaf is
 * witnessable on demand — no per-note witness tracking and no cold-shard
 * recovery (the lean profile's costs) are needed.
 */
export class GlobalNotesTree implements NotesTreeView {
  constructor(private readonly live: LiveNotesTree) {}

  root(): bigint {
    return this.live.tree.root();
  }

  get leafCount(): number {
    return this.live.leaves.length;
  }

  hasWitness(noteId: bigint): boolean {
    return this.live.tree.getIndex(noteId) !== null;
  }

  witness(noteId: bigint): InclusionProof {
    return this.live.tree.createInclusionProof(noteId);
  }
}

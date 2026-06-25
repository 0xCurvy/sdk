import { resolveConfig, type WithConfig } from "@/config";
import type { PendingNotesCommitmentCircuitInputs } from "./circuitInputs";
import { padArray, sha256BigInt } from "./utils";

export type GeneratePendingNotesCommitmentParams = WithConfig<{
  batchSize: number;
  treeDepth: number;
  // Up to `batchSize` real ids. Padded with 0n to batchSize; zero entries are
  // skip slots in the circuit and contribute no insertion / no root change.
  pendingNoteIds: bigint[];
}>;

// Builds the witness for `VerifyPendingNotesCommitment(batchSize, treeDepth)`.
// Mirrors the circuit:
//   1. Seed notes tree with `initialLeaves` → currentNotesRoot, currentNoteIndex.
//   2. For each pendingNoteId i: if zero, siblings = zero[treeDepth] and root
//      / index unchanged; if non-zero, insert at slot (currentNoteIndex + i)
//      and capture siblings of that leaf (= pre-insertion siblings, since
//      only on-path nodes change on insertion).
//   3. Commit via sha256(noteIds + roots + indices).
export const generatePendingNotesCommitmentCircuitInputs = async ({
  config: _config,
  ...params
}: GeneratePendingNotesCommitmentParams): Promise<PendingNotesCommitmentCircuitInputs> => {
  const config = resolveConfig(_config);
  const { batchSize, treeDepth, pendingNoteIds } = params;

  const notesTree = config._internal.notesTree;

  if (pendingNoteIds.length > batchSize) {
    throw new Error(`pendingNoteIds.length (${pendingNoteIds.length}) exceeds batchSize (${batchSize})`);
  }

  const currentNotesRoot = notesTree.root();
  const currentNoteIndex = BigInt(notesTree.getCurrentIndex());
  const paddedIds = padArray([...pendingNoteIds], batchSize, 0n);

  const zeroSiblings = (): bigint[] => new Array<bigint>(treeDepth).fill(0n);
  const siblings: bigint[][] = [];

  for (const noteId of paddedIds) {
    if (noteId === 0n) {
      siblings.push(zeroSiblings());
      continue;
    }
    notesTree.insert(noteId);
    siblings.push(notesTree.createInclusionProof(noteId).siblings);
  }

  const newNotesRoot = notesTree.root();
  const newNoteIndex = BigInt(notesTree.getCurrentIndex());

  const inputHash = await sha256BigInt([...paddedIds, currentNotesRoot, newNotesRoot, currentNoteIndex, newNoteIndex]);

  return {
    circuitInputs: { currentNoteIndex, inputHash, currentNotesRoot, pendingNoteIds: paddedIds, siblings },
    params: {
      newNotesRoot,
    },
  };
};

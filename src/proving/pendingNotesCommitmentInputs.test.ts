import { describe, expect, it } from "vitest";
import { createFakeConfig } from "@/test/fixtures";
import { MerkleTree } from "./merkleTree";
import { generatePendingNotesCommitmentCircuitInputs } from "./pendingNotesCommitmentInputs";
import { sha256BigInt } from "./utils";

// The function builds its witness against `config._internal.notesTree` (the v2
// proving tree) and mutates it in place; `treeDepth` only sizes the zero-slot
// sibling padding, so it must match that tree's depth. Each test gets its own
// config + tree so insertions never bleed across cases.
function configWithNotesTree(depth: number, initialLeaves: bigint[] = []) {
  const config = createFakeConfig();
  const notesTree = new MerkleTree({ depth });
  for (const leaf of initialLeaves) notesTree.insert(leaf);
  config._internal.notesTree = notesTree;
  return config;
}

describe("generatePendingNotesCommitmentCircuitInputs", () => {
  it("throws when pendingNoteIds exceeds batchSize", async () => {
    await expect(
      generatePendingNotesCommitmentCircuitInputs({
        config: configWithNotesTree(6),
        batchSize: 2,
        treeDepth: 6,
        pendingNoteIds: [1n, 2n, 3n],
      }),
    ).rejects.toThrow(/exceeds batchSize/);
  });

  it("pads pendingNoteIds with 0n up to batchSize", async () => {
    const { circuitInputs: r } = await generatePendingNotesCommitmentCircuitInputs({
      config: configWithNotesTree(6),
      batchSize: 4,
      treeDepth: 6,
      pendingNoteIds: [1n, 2n],
    });
    expect(r.pendingNoteIds).toEqual([1n, 2n, 0n, 0n]);
    expect(r.siblings).toHaveLength(4);
    for (const s of r.siblings) expect(s).toHaveLength(6);
  });

  it("zero-slot siblings are all zero (skip slots)", async () => {
    const { circuitInputs: r } = await generatePendingNotesCommitmentCircuitInputs({
      config: configWithNotesTree(5),
      batchSize: 3,
      treeDepth: 5,
      pendingNoteIds: [10n],
    });
    expect(r.siblings[1]).toEqual([0n, 0n, 0n, 0n, 0n]);
    expect(r.siblings[2]).toEqual([0n, 0n, 0n, 0n, 0n]);
  });

  it("currentNotesRoot + currentNoteIndex match the seeded tree state", async () => {
    const config = configWithNotesTree(6, [11n, 22n, 33n]);
    const seededRoot = config._internal.notesTree.root();

    const { circuitInputs: r } = await generatePendingNotesCommitmentCircuitInputs({
      config,
      batchSize: 2,
      treeDepth: 6,
      pendingNoteIds: [44n],
    });
    expect(r.currentNotesRoot).toBe(seededRoot);
    expect(r.currentNoteIndex).toBe(3n);
  });

  it("inputHash = sha256BigInt([...paddedIds, currentRoot, newRoot, currentIdx, newIdx])", async () => {
    const { circuitInputs: r } = await generatePendingNotesCommitmentCircuitInputs({
      config: configWithNotesTree(6),
      batchSize: 3,
      treeDepth: 6,
      pendingNoteIds: [5n, 6n],
    });
    // Re-derive newRoot/newIdx by replaying the insertions in an independent tree.
    const tree = new MerkleTree({ depth: 6 });
    tree.insert(5n);
    tree.insert(6n);
    const expected = await sha256BigInt([5n, 6n, 0n, r.currentNotesRoot, tree.root(), 0n, 2n]);
    expect(r.inputHash).toBe(expected);
  });

  it("all-zero batch leaves tree unchanged and yields hash over zeros + unchanged roots/indices", async () => {
    const { circuitInputs: r } = await generatePendingNotesCommitmentCircuitInputs({
      config: configWithNotesTree(6),
      batchSize: 3,
      treeDepth: 6,
      pendingNoteIds: [],
    });
    const expected = await sha256BigInt([0n, 0n, 0n, r.currentNotesRoot, r.currentNotesRoot, 0n, 0n]);
    expect(r.inputHash).toBe(expected);
  });
});

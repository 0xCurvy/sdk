import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { MerkleTree } from "./merkleTree";
import {
  bytesToField,
  bytesToFields,
  createRustNotesFrontier,
  createRustOrderedMerkleTreeFromLeaves,
  createRustShardedNotesTree,
  fieldsToBytes,
  fieldToBytes,
  getCoreRuntimeStatus,
  initCore,
  restoreRustNotesFrontier,
  restoreRustShardedNotesTreeParts,
  verifyRustMerkleProof,
} from "./rustCore";

const here = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(here, "../../assets/core-rs/curvy_core_bg.wasm");

beforeAll(async () => {
  await initCore({ bytes: new Uint8Array(readFileSync(wasmPath)) });
});

describe("Rust tree adapters", () => {
  it("uses the single-threaded Rust fallback in Node", () => {
    expect(getCoreRuntimeStatus()).toEqual({ mode: "single-threaded", threadCount: 1 });
  });

  it("keeps duplicate public leaves addressable by position", () => {
    const tree = createRustOrderedMerkleTreeFromLeaves(4, [7n, 7n, 9n]);
    const proof = tree.proofAt(1);
    expect(bytesToField(proof.leaf)).toBe(7n);
    expect(proof.index).toBe(1);
    expect(
      verifyRustMerkleProof(
        bytesToField(proof.leaf),
        proof.index,
        bytesToFields(proof.siblings),
        bytesToField(proof.root),
      ),
    ).toBe(true);
    proof.free();
    tree.free();
  });

  it("keeps the compact frontier byte-identical to the full Rust tree", () => {
    const leaves = Array.from({ length: 21 }, (_, index) => BigInt(index + 1));
    const frontier = createRustNotesFrontier(8, 3);
    const emittedRoots: bigint[] = [];

    for (let index = 0; index < leaves.length; index++) {
      const appended = frontier.append(fieldToBytes(leaves[index]));
      expect(appended.leafIndex).toBe(index);
      if (appended.hasCompletedShard) emittedRoots.push(bytesToField(appended.completedShardRoot));
      appended.free();

      expect(bytesToField(frontier.root())).toBe(
        MerkleTree.fromLeaves({ depth: 8 }, leaves.slice(0, index + 1)).root(),
      );
    }

    expect(emittedRoots).toEqual([
      MerkleTree.fromLeaves({ depth: 3 }, leaves.slice(0, 8)).root(),
      MerkleTree.fromLeaves({ depth: 3 }, leaves.slice(8, 16)).root(),
    ]);
    frontier.free();
  });

  it("restores a frontier snapshot and continues with the same root and shard sequence", () => {
    const first = Array.from({ length: 13 }, (_, index) => BigInt(index + 1));
    const tail = Array.from({ length: 11 }, (_, index) => BigInt(index + 14));
    const original = createRustNotesFrontier(8, 3);
    original.appendMany(fieldsToBytes(first)).forEach((shard) => {
      shard.free();
    });

    const restored = restoreRustNotesFrontier(original.snapshot());
    const originalShards = original.appendMany(fieldsToBytes(tail));
    const restoredShards = restored.appendMany(fieldsToBytes(tail));

    expect(bytesToField(restored.root())).toBe(bytesToField(original.root()));
    expect(restoredShards.map((shard) => [shard.shardIndex, bytesToField(shard.root)])).toEqual(
      originalShards.map((shard) => [shard.shardIndex, bytesToField(shard.root)]),
    );

    originalShards.forEach((shard) => {
      shard.free();
    });
    restoredShards.forEach((shard) => {
      shard.free();
    });
    restored.free();
    original.free();
  });

  it("restores split wallet storage and produces a conventional verified witness", () => {
    const leaves = Array.from({ length: 21 }, (_, index) => BigInt(index + 1));
    const tree = createRustShardedNotesTree(8, 3);
    tree.markOwned(fieldToBytes(leaves[2]), 2);
    tree.markOwned(fieldToBytes(leaves[19]), 19);
    tree.appendMany(fieldsToBytes(leaves));

    const restored = restoreRustShardedNotesTreeParts(
      8,
      3,
      bytesToFields(tree.completedShardRoots()),
      bytesToFields(tree.liveLeaves()),
    );
    for (const owned of tree.ownedNotes()) {
      if (owned.frozen) {
        restored.adoptFrozenWitness(owned.noteId, owned.leafIndex, owned.withinShardSiblings);
      } else {
        restored.markOwned(owned.noteId, owned.leafIndex);
      }
      owned.free();
    }

    const proof = restored.witness(fieldToBytes(leaves[2]));
    expect(
      verifyRustMerkleProof(
        bytesToField(proof.leaf),
        proof.index,
        bytesToFields(proof.siblings),
        bytesToField(proof.root),
      ),
    ).toBe(true);
    expect(bytesToField(proof.root)).toBe(MerkleTree.fromLeaves({ depth: 8 }, leaves).root());

    proof.free();
    restored.free();
    tree.free();
  });
});

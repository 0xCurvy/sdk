import { describe, expect, it } from "vitest";
import { MerkleTree } from "./merkleTree";

describe("MerkleTree", () => {
  it("insert + createProof + verifyProof round-trip", () => {
    const tree = new MerkleTree({ depth: 10 });
    tree.insert(100n);
    tree.insert(200n);
    tree.insert(300n);

    const proof = tree.createInclusionProof(200n);
    expect(proof.leaf).toBe(200n);
    expect(proof.root).toBe(tree.root());
    expect(tree.verifyProof(proof)).toBe(true);
  });

  it("rejects duplicate insertion", () => {
    const tree = new MerkleTree({ depth: 8 });
    tree.insert(1n);
    expect(() => tree.insert(1n)).toThrow(/already exists/);
  });

  it("createProof on a missing leaf throws", () => {
    const tree = new MerkleTree({ depth: 8 });
    tree.insert(1n);
    expect(() => tree.createInclusionProof(2n)).toThrow(/not found/);
  });

  it("getIndex returns null for missing leaves, number for present", () => {
    const tree = new MerkleTree({ depth: 8 });
    tree.insert(42n);
    expect(tree.getIndex(42n)).toBe(0);
    expect(tree.getIndex(99n)).toBe(null);
  });

  it("insertMany inserts in order", () => {
    const tree = new MerkleTree({ depth: 8 });
    tree.insertMany([10n, 20n, 30n]);
    expect(tree.getIndex(10n)).toBe(0);
    expect(tree.getIndex(20n)).toBe(1);
    expect(tree.getIndex(30n)).toBe(2);
  });

  it("root changes after insert", () => {
    const tree = new MerkleTree({ depth: 8 });
    const empty = tree.root();
    tree.insert(7n);
    expect(tree.root()).not.toBe(empty);
  });

  it("fromLeaves equals insert-built tree (root, indices, proofs, continuation)", () => {
    const leaves = Array.from({ length: 23 }, (_, i) => BigInt(i + 1) * 1_000n);
    const incremental = new MerkleTree({ depth: 10 });
    incremental.insertMany(leaves);
    const bulk = MerkleTree.fromLeaves({ depth: 10 }, leaves);

    expect(bulk.root()).toBe(incremental.root());
    expect(bulk.getCurrentIndex()).toBe(incremental.getCurrentIndex());
    expect(bulk.getIndex(5_000n)).toBe(4);

    const proof = bulk.createInclusionProof(13_000n);
    expect(bulk.verifyProof(proof)).toBe(true);
    expect(incremental.verifyProof(proof)).toBe(true);

    // delta-sync continuation: appending to a bulk-built tree matches incremental
    bulk.insert(999_999n);
    incremental.insert(999_999n);
    expect(bulk.root()).toBe(incremental.root());
  });

  it("fromLeaves with empty leaves equals a fresh tree", () => {
    expect(MerkleTree.fromLeaves({ depth: 8 }, []).root()).toBe(new MerkleTree({ depth: 8 }).root());
  });

  it("fromLeaves rejects duplicate leaves", () => {
    expect(() => MerkleTree.fromLeaves({ depth: 8 }, [1n, 2n, 1n])).toThrow(/already exists/);
  });

  it("fromOrderedLeaves accepts duplicates and proves each position", () => {
    const tree = MerkleTree.fromOrderedLeaves({ depth: 4 }, [7n, 7n, 9n]);
    const first = tree.createInclusionProofAtIndex(0);
    const second = tree.createInclusionProofAtIndex(1);

    expect(first.index).toBe(0);
    expect(second.index).toBe(1);
    expect(first.leaf).toBe(7n);
    expect(second.leaf).toBe(7n);
    expect(tree.verifyProof(first)).toBe(true);
    expect(tree.verifyProof(second)).toBe(true);
  });
});

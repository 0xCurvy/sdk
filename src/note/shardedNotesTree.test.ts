import { describe, expect, it } from "vitest";
import { MerkleTree } from "@/proving/merkleTree";
import { ShardedNotesTree, type ShardedTreeSnapshot } from "./shardedNotesTree";

// Small geometry so a handful of leaves spans many shards:
// depth 8 (256 slots), shardHeight 3 → 8-leaf shards, 32 shards max.
const DEPTH = 8;
const SHARD_HEIGHT = 3;
const SHARD_SIZE = 1 << SHARD_HEIGHT;

/** Deterministic pseudo-random leaf ids (no Math.random — reproducible failures). */
const leafIds = (n: number, salt = 1n): bigint[] =>
  Array.from({ length: n }, (_, i) => (BigInt(i + 1) * 2654435761n + salt * 97n) % 2n ** 200n);

const flatTree = (leaves: bigint[], depth = DEPTH): MerkleTree => MerkleTree.fromLeaves({ depth }, leaves);

const shardedTree = (leaves: bigint[], markIndices: number[] = []): ShardedNotesTree => {
  const tree = new ShardedNotesTree({ depth: DEPTH, shardHeight: SHARD_HEIGHT });
  for (const i of markIndices) tree.mark(leaves[i], i);
  tree.appendMany(leaves);
  return tree;
};

describe("ShardedNotesTree — equivalence with the flat IMT (the cornerstone)", () => {
  it("root equals the flat tree's root AFTER EVERY APPEND, across shard boundaries", () => {
    const ids = leafIds(3 * SHARD_SIZE + 5); // 3 complete shards + partial live shard
    const sharded = new ShardedNotesTree({ depth: DEPTH, shardHeight: SHARD_HEIGHT });
    for (let n = 0; n < ids.length; n++) {
      sharded.append(ids[n]);
      expect(sharded.root()).toBe(flatTree(ids.slice(0, n + 1)).root());
    }
    expect(sharded.shardCount).toBe(3);
    expect(sharded.leafCount).toBe(ids.length);
  });

  it("matches the flat root for boundary sizes: empty, 1, shard-1, shard, shard+1, 2 shards, full-ish", () => {
    for (const n of [0, 1, SHARD_SIZE - 1, SHARD_SIZE, SHARD_SIZE + 1, 2 * SHARD_SIZE, 4 * SHARD_SIZE + 3]) {
      const ids = leafIds(n, BigInt(n + 1));
      expect(shardedTree(ids).root()).toBe(flatTree(ids).root());
    }
  });

  it("matches at other geometries (shardHeight 1 and depth-1)", () => {
    const ids = leafIds(11, 3n);
    for (const shardHeight of [1, DEPTH - 1]) {
      const sharded = new ShardedNotesTree({ depth: DEPTH, shardHeight });
      sharded.appendMany(ids);
      expect(sharded.root()).toBe(flatTree(ids).root());
    }
  });

  it("matches at the production depth (30) with default shardHeight", () => {
    const ids = leafIds(7, 5n);
    const sharded = new ShardedNotesTree();
    sharded.appendMany(ids);
    expect(sharded.root()).toBe(flatTree(ids, 30).root());
  });
});

describe("ShardedNotesTree — witnesses", () => {
  it("witnesses for notes in DIFFERENT shards all verify against the SAME (flat) root", () => {
    const ids = leafIds(3 * SHARD_SIZE + 4);
    const marks = [0, SHARD_SIZE - 1, SHARD_SIZE, 2 * SHARD_SIZE + 3, 3 * SHARD_SIZE + 1]; // shards 0,0,1,2,live
    const sharded = shardedTree(ids, marks);
    const flat = flatTree(ids);

    for (const i of marks) {
      const proof = sharded.witness(ids[i]);
      expect(proof.index).toBe(i);
      expect(proof.leaf).toBe(ids[i]);
      expect(proof.root).toBe(flat.root());
      expect(proof.siblings).toHaveLength(DEPTH);
      expect(flat.verifyProof(proof)).toBe(true); // hashes up to the common root
    }
  });

  it("freezes within-shard siblings at rollover and NEVER mutates them again", () => {
    const ids = leafIds(2 * SHARD_SIZE + 2);
    const sharded = new ShardedNotesTree({ depth: DEPTH, shardHeight: SHARD_HEIGHT });
    sharded.mark(ids[2], 2); // shard 0
    sharded.appendMany(ids.slice(0, SHARD_SIZE)); // completes shard 0 → freezes

    const frozen = [...sharded.witness(ids[2]).siblings.slice(0, SHARD_HEIGHT)];
    sharded.appendMany(ids.slice(SHARD_SIZE)); // grow well past — frontier moves, frozen half must not
    const after = sharded.witness(ids[2]);

    expect(after.siblings.slice(0, SHARD_HEIGHT)).toEqual(frozen);
    expect(flatTree(ids).verifyProof(after)).toBe(true); // still valid at the NEW root
    expect(after.root).toBe(flatTree(ids).root());
  });

  it("witness for a live-shard note works pre-rollover and survives the rollover", () => {
    const ids = leafIds(SHARD_SIZE + 3);
    const sharded = new ShardedNotesTree({ depth: DEPTH, shardHeight: SHARD_HEIGHT });
    sharded.mark(ids[SHARD_SIZE + 1], SHARD_SIZE + 1); // will land in shard 1 (live)
    sharded.appendMany(ids);
    expect(flatTree(ids).verifyProof(sharded.witness(ids[SHARD_SIZE + 1]))).toBe(true);

    // Fill shard 1 to completion — the live-derived witness becomes frozen.
    const more = leafIds(SHARD_SIZE - 3, 11n);
    sharded.appendMany(more);
    const all = [...ids, ...more];
    expect(flatTree(all).verifyProof(sharded.witness(ids[SHARD_SIZE + 1]))).toBe(true);
  });

  it("throws for unmarked notes and for marked-but-not-yet-folded notes", () => {
    const ids = leafIds(4);
    const sharded = shardedTree(ids);
    expect(() => sharded.witness(999n)).toThrow(/not marked/);
    sharded.mark(12345n, 100); // future leaf, never appended
    expect(() => sharded.witness(12345n)).toThrow(/not yet folded/);
  });

  it("unmark removes the witness", () => {
    const ids = leafIds(3);
    const sharded = shardedTree(ids, [1]);
    expect(sharded.hasWitness(ids[1])).toBe(true);
    sharded.unmark(ids[1]);
    expect(() => sharded.witness(ids[1])).toThrow(/not marked/);
  });

  it("mark() rejects leaves in completed shards (adoptFrozenWitness territory)", () => {
    const ids = leafIds(SHARD_SIZE + 1);
    const sharded = shardedTree(ids);
    expect(() => sharded.mark(ids[0], 0)).toThrow(/completed shard .* adoptFrozenWitness/);
  });
});

describe("ShardedNotesTree — cold recovery (adoptFrozenWitness)", () => {
  const setup = () => {
    const ids = leafIds(2 * SHARD_SIZE + 1);
    const sharded = shardedTree(ids); // nothing marked
    // Recover note at leaf 3 (shard 0): rebuild the shard locally, extract siblings.
    const shard0 = MerkleTree.fromLeaves({ depth: SHARD_HEIGHT }, ids.slice(0, SHARD_SIZE));
    const siblings = shard0.createInclusionProof(ids[3]).siblings;
    return { ids, sharded, siblings };
  };

  it("accepts siblings that hash to the verified shard root, then witnesses normally", () => {
    const { ids, sharded, siblings } = setup();
    sharded.adoptFrozenWitness(ids[3], 3, siblings);
    expect(flatTree(ids).verifyProof(sharded.witness(ids[3]))).toBe(true);
  });

  it("rejects tampered siblings (integrity gate against a lying leaf source)", () => {
    const { ids, sharded, siblings } = setup();
    const tampered = [...siblings];
    tampered[1] += 1n;
    expect(() => sharded.adoptFrozenWitness(ids[3], 3, tampered)).toThrow(/do not hash to shard/);
  });

  it("rejects wrong sibling count and not-yet-completed shards", () => {
    const { ids, sharded, siblings } = setup();
    expect(() => sharded.adoptFrozenWitness(ids[3], 3, siblings.slice(1))).toThrow(/expected 3 within-shard/);
    const liveLeaf = 2 * SHARD_SIZE; // lives in the live shard
    expect(() => sharded.adoptFrozenWitness(ids[liveLeaf], liveLeaf, siblings)).toThrow(/not completed/);
  });
});

describe("ShardedNotesTree — snapshot / restore", () => {
  it("round-trips mid-fill state and stays equivalent while both copies keep growing", () => {
    const ids = leafIds(2 * SHARD_SIZE + 3);
    const original = shardedTree(ids, [1, SHARD_SIZE + 2, 2 * SHARD_SIZE + 1]);
    const restored = ShardedNotesTree.fromSnapshot(original.snapshot());

    expect(restored.root()).toBe(original.root());
    expect(restored.leafCount).toBe(original.leafCount);
    for (const i of [1, SHARD_SIZE + 2, 2 * SHARD_SIZE + 1]) {
      expect(restored.witness(ids[i])).toEqual(original.witness(ids[i]));
    }

    const more = leafIds(SHARD_SIZE, 17n); // crosses the next boundary in BOTH copies
    original.appendMany(more);
    restored.appendMany(more);
    expect(restored.root()).toBe(original.root());
    expect(restored.witness(ids[1])).toEqual(original.witness(ids[1]));
  });

  it("rejects a corrupt snapshot: completed-shard witness without frozen siblings", () => {
    const ids = leafIds(SHARD_SIZE + 1);
    const snapshot: ShardedTreeSnapshot = {
      ...shardedTree(ids).snapshot(),
      witnesses: [{ noteId: ids[0].toString(), leafIndex: 0, withinShardSiblings: null }],
    };
    expect(() => ShardedNotesTree.fromSnapshot(snapshot)).toThrow(/no frozen siblings/);
  });
});

describe("ShardedNotesTree — dirty tracking (the sync's persistence set)", () => {
  it("collects marks and rollover-freezes, and drains exactly once", () => {
    const ids = leafIds(SHARD_SIZE + 2);
    const tree = new ShardedNotesTree({ depth: DEPTH, shardHeight: SHARD_HEIGHT });

    tree.mark(ids[1], 1);
    expect(tree.drainDirtyWitnesses().map((w) => w.noteId)).toEqual([ids[1]]);
    expect(tree.drainDirtyWitnesses()).toEqual([]); // drained

    tree.appendMany(ids); // shard 0 completes → ids[1]'s witness freezes → dirty again
    const dirty = tree.drainDirtyWitnesses();
    expect(dirty.map((w) => w.noteId)).toEqual([ids[1]]);
    expect(dirty[0].withinShardSiblings).toHaveLength(SHARD_HEIGHT);
  });
});

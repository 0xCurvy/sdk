import { describe, expect, it } from "vitest";
import { MerkleTree } from "@/proving/merkleTree";
import { MapStorage } from "@/storage/map-storage";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import type { OwnershipResolver } from "./discoverOwnedNotes";
import type { LeafSource, RootVerifier, SyncDelta, SyncedLeaf } from "./notesTreeSync";
import { bootstrapShardRoots, type LeafRangeSource, recoverWitness, syncShardedNotesTree } from "./shardedNotesSync";

// Tiny geometry: depth 8, shardHeight 2 → 4-leaf shards.
const DEPTH = 8;
const SHARD_HEIGHT = 2;
const SHARD_SIZE = 1 << SHARD_HEIGHT;
const NET = "ethereum";
const ENV = "mainnet" as const;

const ids = (n: number, salt = 1n): bigint[] =>
  Array.from({ length: n }, (_, i) => (BigInt(i + 1) * 7919n + salt) % 2n ** 100n);

const bareLeaves = (from: number, leafIds: bigint[]): SyncedLeaf[] =>
  leafIds.map((id, i) => ({ index: from + i, noteId: id.toString() }));

const flatTree = (leaves: bigint[]): MerkleTree => MerkleTree.fromLeaves({ depth: DEPTH }, leaves);

const shardRootOf = (leaves: bigint[]): string =>
  MerkleTree.fromLeaves({ depth: SHARD_HEIGHT }, leaves).root().toString();

// A scripted source that hands out successive deltas and asserts the cursor.
function scriptedSource(deltas: SyncDelta[]): LeafSource {
  let call = 0;
  return {
    async fetchDelta(cursor) {
      const d = deltas[call++] ?? { leaves: [], nullifiers: [], blockNumber: 0 };
      if (d.leaves[0]) expect(d.leaves[0].index).toBe(cursor.leafCount);
      return d;
    },
  };
}

const verifierFor = (tree: MerkleTree): RootVerifier => ({
  async currentRoot() {
    return { root: tree.root(), noteIndex: tree.getCurrentIndex() };
  },
});

const baseOpts = (storage: MapStorage) => ({
  storage,
  networkSlug: NET,
  environment: ENV,
  depth: DEPTH,
  shardHeight: SHARD_HEIGHT,
  now: () => 1000,
});

// ── An ownable note: real ownerHash/noteId algebra so discoverOwnedNotes'
//    integrity gate (recomputed id must equal the on-chain leaf) passes. ──────
const OWNER_PUB: [bigint, bigint] = [3n, 4n];
const OWNER_SS = 5n;
const AMOUNT = 100n;
const TOKEN = 1n;
const OWNED_ID = poseidonHash([poseidonHash([OWNER_PUB[0], OWNER_PUB[1], OWNER_SS]), AMOUNT, TOKEN]);

const ownableLeaf = (index: number): SyncedLeaf => ({
  index,
  noteId: OWNED_ID.toString(),
  ephemeralKey: ["1", "2"],
  viewTag: 0,
  amount: AMOUNT.toString(),
  token: TOKEN.toString(),
  isPlaintext: true,
});

const resolver: OwnershipResolver = async (leaf) =>
  leaf.noteId === OWNED_ID.toString() ? { sharedSecret: OWNER_SS, ownerPub: OWNER_PUB } : null;

describe("syncShardedNotesTree — folding & persistence", () => {
  it("cold sync: folds the delta, banks shard roots, persists the lean state", async () => {
    const storage = new MapStorage();
    const all = ids(2 * SHARD_SIZE + 2); // 2 complete shards + 2 live leaves
    const chain = flatTree(all);

    const res = await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: bareLeaves(0, all), nullifiers: ["3"], blockNumber: 42 }]),
      verifier: verifierFor(chain),
    });

    expect(res.caughtUp).toBe(true);
    expect(res.indexerLag).toBe(0);
    expect(res.newLeaves).toHaveLength(all.length);
    expect(res.tree.root()).toBe(chain.root());

    expect(await storage.getShardRoots(NET)).toEqual([
      shardRootOf(all.slice(0, SHARD_SIZE)),
      shardRootOf(all.slice(SHARD_SIZE, 2 * SHARD_SIZE)),
    ]);
    expect(await storage.getLiveShard(NET)).toMatchObject({
      startIndex: 2 * SHARD_SIZE,
      leaves: all.slice(2 * SHARD_SIZE).map(String),
    });
    expect(await storage.getCommittedLog(NET, "nullifier")).toEqual(["3"]);
    expect(await storage.getNotesCheckpoint(NET, ENV)).toMatchObject({
      leafCount: all.length,
      nullifierCount: 1,
      shardCount: 2,
      root: chain.root().toString(),
      blockNumber: 42,
    });
  });

  it("warm resume: restores the lean state and folds only the tail", async () => {
    const storage = new MapStorage();
    const r1 = ids(SHARD_SIZE + 1);
    const r2 = ids(2 * SHARD_SIZE - 1, 1000n);
    const all = [...r1, ...r2]; // 12 leaves = exactly 3 shards
    const chain = flatTree(all);

    await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: bareLeaves(0, r1), nullifiers: [], blockNumber: 1 }]),
    });
    const res = await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: bareLeaves(r1.length, r2), nullifiers: [], blockNumber: 2 }]),
      verifier: verifierFor(chain),
    });

    expect(res.caughtUp).toBe(true);
    expect(res.tree.root()).toBe(chain.root());
    expect((await storage.getShardRoots(NET)).length).toBe(3);
    expect(await storage.getLiveShard(NET)).toMatchObject({ startIndex: 12, leaves: [] });
  });

  it("throws on a leaf gap and on a root mismatch against chain", async () => {
    const storage = new MapStorage();
    await expect(
      syncShardedNotesTree({
        ...baseOpts(storage),
        source: {
          async fetchDelta() {
            return { leaves: [{ index: 1, noteId: "5" }], nullifiers: [], blockNumber: 1 };
          },
        },
      }),
    ).rejects.toThrow(/leaf gap/);

    const chain = flatTree(ids(3));
    await expect(
      syncShardedNotesTree({
        ...baseOpts(new MapStorage()),
        source: scriptedSource([{ leaves: bareLeaves(0, [1n, 2n, 999n]), nullifiers: [], blockNumber: 1 }]),
        verifier: verifierFor(chain),
      }),
    ).rejects.toThrow(/assembled root .* != on-chain root/);
  });

  it("surfaces indexer lag without failing", async () => {
    const storage = new MapStorage();
    const all = ids(5);
    const res = await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: bareLeaves(0, all.slice(0, 3)), nullifiers: [], blockNumber: 1 }]),
      verifier: verifierFor(flatTree(all)), // chain is 2 ahead
    });
    expect(res.caughtUp).toBe(false);
    expect(res.indexerLag).toBe(2);
  });
});

describe("syncShardedNotesTree — discovery, freezing, spends", () => {
  it("discovers an owned note, then a LATER run's rollover freezes its witness durably", async () => {
    const storage = new MapStorage();
    const before = ids(1); // leaf 0
    const after = ids(SHARD_SIZE, 500n); // leaves 2..5 — completes shard 0 at leaf 3
    const all = [...before, OWNED_ID, ...after]; // owned note at leaf 1
    const chain = flatTree(all);

    // Run 1: owned note arrives in the live shard — witness exists, not frozen.
    const run1 = await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: [...bareLeaves(0, before), ownableLeaf(1)], nullifiers: [], blockNumber: 1 }]),
      resolveOwnership: resolver,
    });
    expect(run1.newOwned).toHaveLength(1);
    expect(run1.newOwned[0]).toMatchObject({ noteId: OWNED_ID.toString(), leafIndex: 1, amount: AMOUNT });
    expect((await storage.getNoteWitnesses(NET))[0]).toMatchObject({
      noteId: OWNED_ID.toString(),
      withinShardSiblings: null, // shard 0 still live
    });

    // Run 2 (fresh engine instance — restores from storage): shard 0 completes.
    const run2 = await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: bareLeaves(2, after), nullifiers: [], blockNumber: 2 }]),
      verifier: verifierFor(chain),
      resolveOwnership: resolver,
    });
    expect(run2.caughtUp).toBe(true);

    const stored = await storage.getNoteWitnesses(NET);
    expect(stored).toHaveLength(1);
    expect(stored[0].withinShardSiblings).toHaveLength(SHARD_HEIGHT); // frozen + persisted

    const proof = run2.tree.witness(OWNED_ID);
    expect(proof.index).toBe(1);
    expect(proof.root).toBe(chain.root());
    expect(chain.verifyProof(proof)).toBe(true);
  });

  it("reconciles a spend observed in the delta: unmarks + deletes the stored witness", async () => {
    const storage = new MapStorage();
    const nullifier = 777n;

    await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: [ownableLeaf(0)], nullifiers: [], blockNumber: 1 }]),
      resolveOwnership: resolver,
    });
    expect(await storage.getNoteWitnesses(NET)).toHaveLength(1);

    const res = await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: [], nullifiers: [nullifier.toString()], blockNumber: 2 }]),
      ownedNullifiers: new Map([[nullifier, OWNED_ID]]),
    });

    expect(res.spentNoteIds).toEqual([OWNED_ID]);
    expect(res.tree.hasWitness(OWNED_ID)).toBe(false);
    expect(await storage.getNoteWitnesses(NET)).toHaveLength(0);
    expect((await storage.getNotesCheckpoint(NET, ENV))?.nullifierCount).toBe(1);
  });

  it("reconciles a note received AND spent within the SAME window (H3): no phantom balance", async () => {
    const storage = new MapStorage();
    // The note's real nullifier = poseidon([sharedSecret, pub.x, pub.y]).
    const nullifier = poseidonHash([OWNER_SS, OWNER_PUB[0], OWNER_PUB[1]]);

    // One delta carries BOTH the owned leaf and its nullifier, with NO stored
    // balance map (fresh wallet) — the pre-sync reconciliation set is empty.
    const res = await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: [ownableLeaf(0)], nullifiers: [nullifier.toString()], blockNumber: 1 }]),
      resolveOwnership: resolver,
    });

    // Discovered as owned, yet reconciled as spent from the same window — the
    // window's newOwned must be folded into the lookup or it becomes phantom-live.
    expect(res.newOwned.map((n) => n.noteId)).toContain(OWNED_ID.toString());
    expect(res.spentNoteIds).toEqual([OWNED_ID]);
  });
});

describe("recoverWitness — cold notes from the dumb leaf feed", () => {
  const world = async () => {
    const storage = new MapStorage();
    const all = ids(3 * SHARD_SIZE);
    const { tree } = await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: bareLeaves(0, all), nullifiers: [], blockNumber: 1 }]),
      verifier: verifierFor(flatTree(all)),
    });
    const rangeSource: LeafRangeSource = {
      async fetchRange(from, count) {
        return bareLeaves(from, all.slice(from, from + count));
      },
    };
    return { all, tree, rangeSource };
  };

  it("rebuilds one shard locally and adopts a verified frozen witness", async () => {
    const { all, tree, rangeSource } = await world();
    await recoverWitness(tree, rangeSource, all[2], 2);
    expect(flatTree(all).verifyProof(tree.witness(all[2]))).toBe(true);
  });

  it("rejects a lying source: tampered shard leaves cannot reproduce the verified shard root", async () => {
    const { all, tree, rangeSource } = await world();
    const lying: LeafRangeSource = {
      async fetchRange(from, count) {
        const leaves = await rangeSource.fetchRange(from, count);
        leaves[1] = { ...leaves[1], noteId: "31337" }; // tamper a neighbor, keep the target
        return leaves;
      },
    };
    await expect(recoverWitness(tree, lying, all[2], 2)).rejects.toThrow(/do not hash to shard/);
  });

  it("rejects a mis-ranged response", async () => {
    const { all, tree, rangeSource } = await world();
    const shifted: LeafRangeSource = {
      async fetchRange(from, count) {
        return bareLeaves(from + 1, all.slice(from + 1, from + 1 + count));
      },
    };
    await expect(recoverWitness(tree, shifted, all[2], 2)).rejects.toThrow(/leaf range gap/);
    void rangeSource;
  });
});

describe("bootstrapShardRoots — wallet birthday", () => {
  it("seeds shard roots without leaf history; first sync validates them against chain", async () => {
    const storage = new MapStorage();
    const history = ids(3 * SHARD_SIZE); // 12 leaves the wallet never downloads
    const newLeaves = [OWNED_ID]; // born at leaf 12
    const all = [...history, ...newLeaves];
    const chain = flatTree(all);

    await bootstrapShardRoots(storage, NET, [
      shardRootOf(history.slice(0, SHARD_SIZE)),
      shardRootOf(history.slice(SHARD_SIZE, 2 * SHARD_SIZE)),
      shardRootOf(history.slice(2 * SHARD_SIZE)),
    ]);

    const res = await syncShardedNotesTree({
      ...baseOpts(storage),
      source: scriptedSource([{ leaves: [ownableLeaf(3 * SHARD_SIZE)], nullifiers: [], blockNumber: 9 }]),
      verifier: verifierFor(chain),
      resolveOwnership: resolver,
    });

    expect(res.caughtUp).toBe(true); // assembled root == chain root → bootstrap was honest
    expect(res.tree.root()).toBe(chain.root());
    expect(res.newOwned).toHaveLength(1);
    expect(chain.verifyProof(res.tree.witness(OWNED_ID))).toBe(true);
  });

  it("a FORGED bootstrap root is caught by the first sync's chain check", async () => {
    const storage = new MapStorage();
    const history = ids(SHARD_SIZE);
    const all = [...history, 99n];
    await bootstrapShardRoots(storage, NET, ["12345"]); // forged
    await expect(
      syncShardedNotesTree({
        ...baseOpts(storage),
        source: scriptedSource([{ leaves: bareLeaves(SHARD_SIZE, [99n]), nullifiers: [], blockNumber: 1 }]),
        verifier: verifierFor(flatTree(all)),
      }),
    ).rejects.toThrow(/assembled root .* != on-chain root/);
  });

  it("refuses to seed over existing roots", async () => {
    const storage = new MapStorage();
    await bootstrapShardRoots(storage, NET, ["1"]);
    await expect(bootstrapShardRoots(storage, NET, ["2"])).rejects.toThrow(/already present/);
  });
});

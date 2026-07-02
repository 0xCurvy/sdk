import { describe, expect, it } from "vitest";
import { MerkleTree } from "@/proving/merkleTree";
import { MapStorage } from "@/storage/map-storage";
import { type LeafSource, type RootVerifier, rebuildNotesTree, type SyncDelta, syncNotesTree } from "./notesTreeSync";

const DEPTH = 30;
const NET = "ethereum";
const ENV = "mainnet" as const;

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

const leafObjs = (from: number, ids: bigint[]): SyncDelta["leaves"] =>
  ids.map((id, i) => ({ index: from + i, noteId: id.toString() }));

const verifierFor = (tree: MerkleTree): RootVerifier => ({
  async currentRoot() {
    return { root: tree.root(), noteIndex: tree.getCurrentIndex() };
  },
});

describe("rebuildNotesTree", () => {
  it("bulk-rebuilds from the persisted logs and matches an insert-built tree", () => {
    const ids = Array.from({ length: 12 }, (_, i) => BigInt(i + 1) * 100n);
    const ref = new MerkleTree({ depth: DEPTH });
    ref.insertMany(ids);
    const live = rebuildNotesTree(
      ids.map((i) => i.toString()),
      ["7", "9"],
      DEPTH,
    );
    expect(live.tree.root()).toBe(ref.root());
    expect(live.leaves).toHaveLength(12);
    expect(live.nullifiers).toEqual(new Set([7n, 9n]));
  });
});

describe("syncNotesTree (engine over chunked storage)", () => {
  it("cold sync: pulls the full delta, verifies against chain, persists chunked", async () => {
    const storage = new MapStorage();
    const ids = Array.from({ length: 5 }, (_, i) => BigInt(i + 1) * 11n);
    const chain = new MerkleTree({ depth: DEPTH });
    chain.insertMany(ids);

    const source = scriptedSource([{ leaves: leafObjs(0, ids), nullifiers: ["3"], blockNumber: 42 }]);
    const res = await syncNotesTree({
      storage,
      networkSlug: NET,
      environment: ENV,
      source,
      verifier: verifierFor(chain),
      now: () => 1000,
    });

    expect(res.caughtUp).toBe(true);
    expect(res.indexerLag).toBe(0);
    expect(res.newLeaves).toHaveLength(5);
    expect(res.live.tree.root()).toBe(chain.root());

    expect(await storage.getCommittedLog(NET, "leaf")).toEqual(ids.map((i) => i.toString()));
    expect(await storage.getCommittedLog(NET, "nullifier")).toEqual(["3"]);
    const cp = await storage.getNotesCheckpoint(NET, ENV);
    expect(cp).toMatchObject({ leafCount: 5, nullifierCount: 1, root: chain.root().toString(), blockNumber: 42 });
  });

  it("warm delta sync: resumes from the persisted cursor, appends only the new tail", async () => {
    const storage = new MapStorage();
    const chain = new MerkleTree({ depth: DEPTH });

    const r1 = [1n, 2n, 3n];
    chain.insertMany(r1);
    await syncNotesTree({
      storage,
      networkSlug: NET,
      environment: ENV,
      source: scriptedSource([{ leaves: leafObjs(0, r1), nullifiers: [], blockNumber: 1 }]),
      verifier: verifierFor(chain),
    });

    const r2 = [4n, 5n];
    chain.insertMany(r2);
    const res = await syncNotesTree({
      storage,
      networkSlug: NET,
      environment: ENV,
      source: scriptedSource([{ leaves: leafObjs(3, r2), nullifiers: ["1"], blockNumber: 2 }]),
      verifier: verifierFor(chain),
    });

    expect(res.newLeaves.map((l) => l.noteId)).toEqual(["4", "5"]);
    expect(res.caughtUp).toBe(true);
    expect(res.live.tree.root()).toBe(chain.root());
    expect(await storage.getCommittedLog(NET, "leaf")).toEqual(["1", "2", "3", "4", "5"]);
    expect((await storage.getNotesCheckpoint(NET, ENV))?.nullifierCount).toBe(1);
  });

  it("surfaces indexer lag (no throw) when the source is behind the chain head", async () => {
    const storage = new MapStorage();
    const chain = new MerkleTree({ depth: DEPTH });
    chain.insertMany([1n, 2n, 3n, 4n, 5n]); // chain at 5

    const res = await syncNotesTree({
      storage,
      networkSlug: NET,
      environment: ENV,
      source: scriptedSource([{ leaves: leafObjs(0, [1n, 2n, 3n]), nullifiers: [], blockNumber: 1 }]),
      verifier: verifierFor(chain),
    });
    expect(res.caughtUp).toBe(false);
    expect(res.indexerLag).toBe(2);
    expect(await storage.getCommittedLogCount(NET, "leaf")).toBe(3);
  });

  it("surfaces negative lag (no throw) when the one-shot chain read trails the leaf stream", async () => {
    const storage = new MapStorage();
    const chain = new MerkleTree({ depth: DEPTH });
    chain.insertMany([1n, 2n, 3n]); // verifier's RPC replica still at 3 (pre-commit)

    // The indexer (leaf source) is already at head and delivers 5 committed leaves.
    const res = await syncNotesTree({
      storage,
      networkSlug: NET,
      environment: ENV,
      source: scriptedSource([{ leaves: leafObjs(0, [1n, 2n, 3n, 4n, 5n]), nullifiers: [], blockNumber: 2 }]),
      verifier: verifierFor(chain),
    });
    expect(res.caughtUp).toBe(false);
    expect(res.indexerLag).toBe(-2); // leaves ahead of my RPC read — benign, reconciles next pass
    expect(res.live.leaves).toHaveLength(5);
    expect(await storage.getCommittedLogCount(NET, "leaf")).toBe(5);
  });

  it("throws on a bad source (wrong leaves → root mismatch against chain)", async () => {
    const storage = new MapStorage();
    const chain = new MerkleTree({ depth: DEPTH });
    chain.insertMany([1n, 2n, 3n]);
    await expect(
      syncNotesTree({
        storage,
        networkSlug: NET,
        environment: ENV,
        source: scriptedSource([{ leaves: leafObjs(0, [1n, 2n, 999n]), nullifiers: [], blockNumber: 1 }]),
        verifier: verifierFor(chain),
      }),
    ).rejects.toThrow(/root .* != on-chain root/);
  });

  it("throws on a gap in the leaf stream", async () => {
    const storage = new MapStorage();
    await expect(
      syncNotesTree({
        storage,
        networkSlug: NET,
        environment: ENV,
        source: {
          async fetchDelta() {
            return { leaves: [{ index: 1, noteId: "5" }], nullifiers: [], blockNumber: 1 };
          },
        },
      }),
    ).rejects.toThrow(/leaf gap/);
  });
});

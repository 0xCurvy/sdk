import { describe, expect, it, vi } from "vitest";
import type { SyncedLeaf } from "@/note/notesTreeSync";
import type { MultiRpc } from "@/rpc/multi";
import { MapStorage } from "@/storage/map-storage";
import {
  accounts,
  createFakeApi,
  createFakeConfig,
  createFakeCore,
  fakeBalanceEntry,
  fakeCurvyAccount,
  fixtureNetwork,
} from "@/test/fixtures";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import {
  apiLeafSource,
  apiRangeSource,
  balanceOwnershipResolver,
  coreOwnershipResolver,
  ownedNullifiersFromBalances,
  rpcRootVerifier,
} from "./seams";

const NET = "ethereum";
const CONTRACT = "0x00000000000000000000000000000000000000aa";
const CHECKPOINT = "checkpoint-1";

/** A fake `api.sync` backed by fixed in-memory streams (with real pagination math). */
function fakeSyncApi(leaves: SyncedLeaf[], nullifiers: string[], lastIndexedBlock = 7) {
  return {
    GetMeta: vi.fn(async () => ({
      checkpoint: CHECKPOINT,
      chainId: 1,
      contractAddress: CONTRACT,
      treeVersion: 1,
      finalizedBlockNumber: lastIndexedBlock,
      finalizedBlockHash: `0x${"f".repeat(64)}`,
      notesRoot: "0",
      noteCount: leaves.length,
      nullifierCount: nullifiers.length,
      pendingCount: 0,
      shardCount: 0,
      shardHeight: 14,
      shardSize: 1 << 14,
    })),
    GetNotes: vi.fn(async (_chainId: number, fromIndex: number, limit = 500) => {
      const notes = leaves.slice(fromIndex, fromIndex + limit);
      return { checkpoint: CHECKPOINT, fromIndex, notes, nextIndex: fromIndex + notes.length, total: leaves.length };
    }),
    GetNullifiers: vi.fn(async (_chainId: number, fromIndex: number, limit = 500) => {
      const page = nullifiers.slice(fromIndex, fromIndex + limit).map((nullifier, i) => ({
        index: fromIndex + i,
        nullifier,
      }));
      return {
        checkpoint: CHECKPOINT,
        fromIndex,
        nullifiers: page,
        nextIndex: fromIndex + page.length,
        total: nullifiers.length,
      };
    }),
    GetShardRoots: vi.fn(),
  };
}

const bareLeaves = (n: number): SyncedLeaf[] =>
  Array.from({ length: n }, (_, i) => ({ index: i, noteId: String(1000 + i) }));

describe("apiLeafSource", () => {
  it("drains both streams from the cursors across pages and reports the indexer block", async () => {
    const sync = fakeSyncApi(bareLeaves(10), ["7", "8", "9"], 99);
    const config = createFakeConfig({
      api: createFakeApi({ sync }),
      networks: [fixtureNetwork({ aggregatorContractAddress: CONTRACT })],
    });

    const delta = await apiLeafSource(config, { chainId: 1, pageSize: 4 }).fetchDelta({
      leafCount: 2,
      nullifierCount: 1,
    });

    expect(delta.leaves.map((l) => l.index)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(delta.nullifiers).toEqual(["8", "9"]);
    expect(delta.blockNumber).toBe(99);
    expect(sync.GetNotes.mock.calls.length).toBeGreaterThanOrEqual(2); // pagination actually paginated
  });
});

describe("apiRangeSource", () => {
  it("fetches exactly the requested range, paging as needed", async () => {
    const sync = fakeSyncApi(bareLeaves(20), []);
    const config = createFakeConfig({
      api: createFakeApi({ sync }),
      networks: [fixtureNetwork({ aggregatorContractAddress: CONTRACT })],
    });

    const range = await apiRangeSource(config, { chainId: 1, pageSize: 3 }).fetchRange(4, 8);
    expect(range.map((l) => l.index)).toEqual([4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("rejects a range beyond the finalized checkpoint", async () => {
    const sync = fakeSyncApi(bareLeaves(5), []);
    const config = createFakeConfig({
      api: createFakeApi({ sync }),
      networks: [fixtureNetwork({ aggregatorContractAddress: CONTRACT })],
    });
    await expect(apiRangeSource(config, { chainId: 1 }).fetchRange(3, 10)).rejects.toThrow(/exceeds checkpoint/);
  });
});

describe("rpcRootVerifier", () => {
  it("reads root + noteIndex from the network's aggregator contract", async () => {
    const readContract = vi.fn(async ({ functionName }: { functionName: string }) =>
      functionName === "getCurrentNotesTreeRoot" ? 42n : 7n,
    );
    const rpc = { Network: vi.fn(() => ({ provider: { readContract } })) } as unknown as MultiRpc;
    const network = fixtureNetwork({ aggregatorContractAddress: "0x00000000000000000000000000000000000000aa" });
    const config = createFakeConfig({ rpc, networks: [network] });

    expect(await rpcRootVerifier(config, NET).currentRoot()).toEqual({ root: 42n, noteIndex: 7 });
    expect(readContract).toHaveBeenCalledTimes(2);
  });

  it("throws when the network has no aggregator address", async () => {
    const config = createFakeConfig({ networks: [fixtureNetwork()] });
    await expect(rpcRootVerifier(config, NET).currentRoot()).rejects.toThrow(/no aggregatorContractAddress/);
  });
});

describe("balance-derived ownership seams", () => {
  const owner = { babyJubjubPublicKey: { x: "11", y: "12" }, sharedSecret: "13" };

  const seededConfig = async () => {
    const storage = new MapStorage();
    const config = createFakeConfig({ storage });
    await storage.updateBalanceEntries(accounts[0].id, NET, [fakeBalanceEntry({ id: "777", owner })]);
    await storage.updateBalanceEntries(accounts[0].id, "other-net", [
      fakeBalanceEntry({ id: "888", networkSlug: "other-net" }),
    ]);
    return config;
  };

  it("balanceOwnershipResolver claims exactly the account's notes on that network", async () => {
    const resolve = await balanceOwnershipResolver(await seededConfig(), accounts[0].id, NET);
    expect(await resolve({ index: 0, noteId: "777" })).toEqual({ sharedSecret: 13n, ownerPub: [11n, 12n] });
    expect(await resolve({ index: 1, noteId: "888" })).toBeNull(); // other network
    expect(await resolve({ index: 2, noteId: "999" })).toBeNull(); // not ours
  });

  it("ownedNullifiersFromBalances maps poseidon(ss, x, y) → noteId", async () => {
    const map = await ownedNullifiersFromBalances(await seededConfig(), accounts[0].id, NET);
    expect(map.get(poseidonHash([13n, 11n, 12n]))).toBe(777n);
    expect(map.size).toBe(1);
  });
});

describe("coreOwnershipResolver (local-ECDH)", () => {
  /** Wire a fake `core.scanNotes` and a key-bearing account into a config. */
  const withScan = (scanNotes: ReturnType<typeof vi.fn>) => {
    const account = fakeCurvyAccount();
    const config = createFakeConfig({
      activeAccountId: account.id,
      liveAccounts: new Map([[account.id, account]]),
      core: createFakeCore({ scanNotes }),
    });
    return { config, account };
  };

  it("bridges a leaf's [x,y] / numeric viewTag into the WASM scan's 'x.y' + hex shape", async () => {
    const scanNotes = vi.fn(async () => ({ spendingPubKeys: ["77.88"], spendingPrivKeys: [] }));
    const { config, account } = withScan(scanNotes);
    const resolve = coreOwnershipResolver(config, account.id);

    const leaf: SyncedLeaf = { index: 0, noteId: "n1", ephemeralKey: ["5", "9"], viewTag: 789 };
    await resolve.prescan?.([leaf]);

    // R packed as "x.y"; viewTag as hex PADDED to >= 2 chars — the Go-WASM scan
    // slices viewTag[:2], so a 1-char tag (e.g. "0") would panic the batch.
    expect(scanNotes).toHaveBeenCalledTimes(1);
    expect(scanNotes).toHaveBeenCalledWith(account.keyPairs.s, account.keyPairs.v, [
      { ephemeralKey: "5.9", viewTag: "315" },
    ]);

    const [ex, ey] = account.keyPairs.babyJubjubPublicKey.split(".").map(BigInt);
    expect(await resolve(leaf)).toEqual({ sharedSecret: 77n, ownerPub: [ex, ey] });
  });

  it("returns null for a leaf the scan does not claim (empty spendingPubKey)", async () => {
    const scanNotes = vi.fn(async () => ({ spendingPubKeys: [""], spendingPrivKeys: [] }));
    const { config, account } = withScan(scanNotes);
    const resolve = coreOwnershipResolver(config, account.id);

    const leaf: SyncedLeaf = { index: 0, noteId: "n1", ephemeralKey: ["5", "9"], viewTag: 1 };
    await resolve.prescan?.([leaf]);
    expect(await resolve(leaf)).toBeNull();
  });

  it("batches the whole delta into ONE scanNotes call and skips bare (delivery-less) leaves", async () => {
    const scanNotes = vi.fn(async () => ({ spendingPubKeys: ["77.88", ""], spendingPrivKeys: [] }));
    const { config, account } = withScan(scanNotes);
    const resolve = coreOwnershipResolver(config, account.id);

    const leaves: SyncedLeaf[] = [
      { index: 0, noteId: "owned", ephemeralKey: ["1", "2"], viewTag: 1 },
      { index: 1, noteId: "bare" }, // no delivery data → never scanned
      { index: 2, noteId: "notmine", ephemeralKey: ["3", "4"], viewTag: 2 },
    ];
    await resolve.prescan?.(leaves);

    expect(scanNotes).toHaveBeenCalledTimes(1);
    expect(scanNotes).toHaveBeenCalledWith(account.keyPairs.s, account.keyPairs.v, [
      { ephemeralKey: "1.2", viewTag: "01" },
      { ephemeralKey: "3.4", viewTag: "02" },
    ]);

    const [ex, ey] = account.keyPairs.babyJubjubPublicKey.split(".").map(BigInt);
    expect(await resolve(leaves[0])).toEqual({ sharedSecret: 77n, ownerPub: [ex, ey] });
    expect(await resolve(leaves[1])).toBeNull(); // bare
    expect(await resolve(leaves[2])).toBeNull(); // scan returned empty
  });
});

import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { SerializedCurvyAccount } from "@/types";
import type { BalanceEntry, CurrencyMetadata, TxHistoryEntry } from "@/types/storage";
import { IndexedDBStorage } from "./idb-storage";

const account = {
  id: "acc-1",
  createdAt: 1,
  ownerAddress: "0xowner",
  curvyHandle: "alice.curvy.name",
} as unknown as SerializedCurvyAccount;

function makeEntry(overrides: Partial<BalanceEntry> = {}): BalanceEntry {
  return {
    accountId: "acc-1",
    networkSlug: "ethereum",
    environment: "testnet",
    currencyAddress: "0xusdc",
    vaultTokenId: 42n,
    symbol: "USDC",
    decimals: 6,
    balance: 100n,
    lastUpdated: 0,
    source: "0xabc",
    id: "note-1",
    owner: { babyJubjubPublicKey: { x: "1", y: "2" }, sharedSecret: "3" },
    deliveryTag: { ephemeralKey: "4.5", viewTag: "0x6" },
    ...overrides,
  };
}

const meta: CurrencyMetadata = {
  address: "0xusdc",
  vaultTokenId: "42",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  iconUrl: "",
  networkSlug: "ethereum",
  environment: "testnet",
};

let dbCounter = 0;
let storage: IndexedDBStorage;

describe("IndexedDBStorage (Dexie schema + queries)", () => {
  beforeEach(() => {
    // Fresh database per test so fake-indexeddb state does not leak.
    dbCounter += 1;
    storage = new IndexedDBStorage(`curvy-test-${dbCounter}`);
  });

  it("persists an account with scan cursors and round-trips it", async () => {
    await storage.insertCurvyAccount(account);
    const data = await storage.getCurvyAccountDataById("acc-1");
    expect(data.curvyHandle).toBe("alice.curvy.name");
    expect(data.scanCursors).toEqual({ latest: undefined, oldest: undefined });
    await expect(storage.insertCurvyAccount(account)).rejects.toThrow(/already exists/);
  });

  it("tracks balances + totals and supports the compound-key queries", async () => {
    await storage.updateBalanceEntries("acc-1", "ethereum", [
      makeEntry({ id: "n1", balance: 100n }),
      makeEntry({ id: "n2", balance: 250n }),
    ]);

    expect(await storage.getBalances("acc-1")).toHaveLength(2);
    expect(await storage.getBalances("acc-1", "testnet")).toHaveLength(2);
    expect(await storage.getBalancesByCurrencyAndNetwork("acc-1", "0xusdc", "ethereum")).toHaveLength(2);
    expect((await storage.getTotals("acc-1"))[0].totalBalance).toBe("350");

    // Drop n2; total decrements and the row is deleted.
    await storage.updateBalanceEntries("acc-1", "ethereum", [makeEntry({ id: "n1", balance: 100n })]);
    expect(await storage.getBalances("acc-1")).toHaveLength(1);
    expect((await storage.getTotals("acc-1"))[0].totalBalance).toBe("100");
  });

  it("looks up currency metadata by address and bigint vault token id", async () => {
    await storage.upsertCurrencyMetadata(new Map([["0xusdc-ethereum", meta]]));
    expect((await storage.getCurrencyMetadata("0xusdc", "ethereum")).symbol).toBe("USDC");
    expect((await storage.getCurrencyMetadata(42n, "ethereum")).symbol).toBe("USDC");
    await expect(storage.getCurrencyMetadata("0xmissing", "ethereum")).rejects.toThrow(/not found/);
  });

  it("stores prices and clears all stores", async () => {
    await storage.upsertPriceData(new Map([["USDC", { price: "1.00", decimals: 6 }]]));
    expect((await storage.getCurrencyPrice("USDC")).price).toBe("1.00");
    expect((await storage.getPriceFeed()).size).toBe(1);

    await storage.insertCurvyAccount(account);
    await storage.clearStorage();
    expect(await storage.getBalances("acc-1")).toHaveLength(0);
    expect((await storage.getPriceFeed()).size).toBe(0);
  });

  it("round-trips the sharded notes-tree stores and clears them", async () => {
    // Shard roots: chunked, append-only from the cursor.
    expect(await storage.getShardRoots("ethereum")).toEqual([]);
    await storage.appendShardRoots("ethereum", 0, ["1", "2"]);
    await storage.appendShardRoots("ethereum", 2, ["3"]);
    expect(await storage.getShardRoots("ethereum")).toEqual(["1", "2", "3"]);
    await expect(storage.appendShardRoots("ethereum", 9, ["x"])).rejects.toThrow(/non-contiguous/);

    // Note witnesses: keyed by [networkSlug, noteId]; upsert overwrites.
    await storage.putNoteWitness({
      networkSlug: "ethereum",
      noteId: "100",
      leafIndex: 0,
      shardIndex: 0,
      withinShardSiblings: null,
    });
    await storage.putNoteWitness({
      networkSlug: "ethereum",
      noteId: "100",
      leafIndex: 0,
      shardIndex: 0,
      withinShardSiblings: ["7"],
    });
    const witnesses = await storage.getNoteWitnesses("ethereum");
    expect(witnesses).toHaveLength(1);
    expect(witnesses[0].withinShardSiblings).toEqual(["7"]);
    await storage.deleteNoteWitness("ethereum", "100");
    expect(await storage.getNoteWitnesses("ethereum")).toHaveLength(0);

    // Live shard: one record per network; null before first put, rewritten whole.
    expect(await storage.getLiveShard("ethereum")).toBeNull();
    await storage.putLiveShard({ networkSlug: "ethereum", startIndex: 0, leaves: ["1"] });
    await storage.putLiveShard({ networkSlug: "ethereum", startIndex: 4, leaves: ["5", "6"] });
    expect(await storage.getLiveShard("ethereum")).toEqual({
      networkSlug: "ethereum",
      startIndex: 4,
      leaves: ["5", "6"],
    });

    // Re-seed then clear everything.
    await storage.putNoteWitness({
      networkSlug: "ethereum",
      noteId: "200",
      leafIndex: 1,
      shardIndex: 0,
      withinShardSiblings: null,
    });
    await storage.clearStorage();
    expect(await storage.getShardRoots("ethereum")).toEqual([]);
    expect(await storage.getNoteWitnesses("ethereum")).toHaveLength(0);
    expect(await storage.getLiveShard("ethereum")).toBeNull();
  });

  it("round-trips transaction history (upsert, newest-first, filter) and clears it", async () => {
    function makeTxHistoryEntry(overrides: Partial<TxHistoryEntry> = {}): TxHistoryEntry {
      return {
        id: "ethereum:100:receive",
        accountId: "acc-1",
        networkSlug: "ethereum",
        environment: "testnet",
        kind: "receive",
        noteId: "100",
        amount: "100",
        token: "0xusdc",
        observedAt: 1,
        ...overrides,
      };
    }

    expect(await storage.getTxHistory("acc-1")).toEqual([]);

    await storage.putTxHistory([
      makeTxHistoryEntry({ id: "ethereum:1:receive", networkSlug: "ethereum", observedAt: 10 }),
      makeTxHistoryEntry({ id: "optimism:1:receive", networkSlug: "optimism", observedAt: 20 }),
    ]);

    // Upsert by [accountId+id]: re-putting the same id overwrites in place.
    await storage.putTxHistory([makeTxHistoryEntry({ id: "ethereum:1:receive", observedAt: 10, leafIndex: 7 })]);

    // Newest-first by observedAt (optimism @20 before ethereum @10).
    const all = await storage.getTxHistory("acc-1");
    expect(all.map((e) => e.id)).toEqual(["optimism:1:receive", "ethereum:1:receive"]);
    expect(all.find((e) => e.id === "ethereum:1:receive")?.leafIndex).toBe(7);

    // networkSlug filter.
    const eth = await storage.getTxHistory("acc-1", { networkSlug: "ethereum" });
    expect(eth).toHaveLength(1);
    expect(eth[0].networkSlug).toBe("ethereum");

    await storage.clearStorage();
    expect(await storage.getTxHistory("acc-1")).toEqual([]);
  });
});

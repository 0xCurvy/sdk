import { describe, expect, it } from "vitest";
import type { SerializedCurvyAccount } from "@/types";
import type {
  BalanceEntry,
  CurrencyMetadata,
  HotNoteState,
  HotOverlayReplacement,
  SerializedNoteWitness,
  TxHistoryEntry,
} from "@/types/storage";
import { MapStorage } from "./map-storage";

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

function hotReplacement(noteStates: HotNoteState[]): HotOverlayReplacement {
  return {
    state: {
      networkSlug: "ethereum",
      environment: "testnet",
      generation: 1,
      baseCheckpoint: "checkpoint-10",
      baseBlockNumber: 10,
      baseBlockHash: "0xbase",
      snapshot: "snapshot-11",
      hotBlockNumber: 11,
      hotBlockHash: "0xhot",
      noteCount: 1,
      notesRoot: "1",
      nullifierCount: 0,
      finalityMode: "finalized",
      finalityStatus: "normal",
      observedFinalityLagSeconds: 12,
      estimatedSecondsToFinality: null,
      updatedAt: 1,
    },
    blocks: [],
    accountId: "acc-1",
    noteStates,
  };
}

describe("MapStorage (BaseStorage business logic)", () => {
  it("inserts an account with empty scan cursors and rejects duplicates", async () => {
    const s = new MapStorage();
    await s.insertCurvyAccount(account);

    const data = await s.getCurvyAccountDataById("acc-1");
    expect(data.curvyHandle).toBe("alice.curvy.name");
    expect(data.scanCursors).toEqual({ latest: undefined, oldest: undefined });

    await expect(s.insertCurvyAccount(account)).rejects.toThrow(/already exists/);
  });

  it("throws when getting a missing account", async () => {
    const s = new MapStorage();
    await expect(s.getCurvyAccountDataById("nope")).rejects.toThrow(/not found/);
  });

  it("merges account data updates (deep)", async () => {
    const s = new MapStorage();
    await s.insertCurvyAccount(account);
    await s.updateCurvyAccountData("acc-1", { scanCursors: { latest: 5, oldest: undefined } });
    const data = await s.getCurvyAccountDataById("acc-1");
    expect(data.scanCursors.latest).toBe(5);
  });

  it("upsertCurvyAccount inserts when absent and is idempotent, preserving scan cursors", async () => {
    const s = new MapStorage();

    // First call inserts (initialising scan cursors).
    await s.upsertCurvyAccount(account);
    expect((await s.getCurvyAccountDataById("acc-1")).scanCursors).toEqual({ latest: undefined, oldest: undefined });

    // Simulate scan progress, then re-add the same account (repeat login).
    await s.updateCurvyAccountData("acc-1", { scanCursors: { latest: 7, oldest: 1 } });
    await expect(s.upsertCurvyAccount(account)).resolves.toBeUndefined();

    // No throw, metadata intact, and the scan cursors were preserved (not reset).
    const data = await s.getCurvyAccountDataById("acc-1");
    expect(data.curvyHandle).toBe("alice.curvy.name");
    expect(data.scanCursors).toEqual({ latest: 7, oldest: 1 });
  });

  it("tracks balances and computes totals on updateBalanceEntries", async () => {
    const s = new MapStorage();
    await s.updateBalanceEntries("acc-1", "ethereum", [
      makeEntry({ id: "n1", balance: 100n }),
      makeEntry({ id: "n2", balance: 250n }),
    ]);

    expect(await s.getBalances("acc-1")).toHaveLength(2);
    const totals = await s.getTotals("acc-1");
    expect(totals).toHaveLength(1);
    expect(totals[0].totalBalance).toBe("350");

    const byCurrency = await s.getBalancesByCurrencyAndNetwork("acc-1", "0xusdc", "ethereum");
    expect(byCurrency).toHaveLength(2);
  });

  it("deletes removed entries and decrements totals on a subsequent update", async () => {
    const s = new MapStorage();
    await s.updateBalanceEntries("acc-1", "ethereum", [
      makeEntry({ id: "n1", balance: 100n }),
      makeEntry({ id: "n2", balance: 250n }),
    ]);
    // n2 dropped from the new set.
    await s.updateBalanceEntries("acc-1", "ethereum", [makeEntry({ id: "n1", balance: 100n })]);

    expect(await s.getBalances("acc-1")).toHaveLength(1);
    expect((await s.getTotals("acc-1"))[0].totalBalance).toBe("100");
  });

  it("filters balances and totals by environment", async () => {
    const s = new MapStorage();
    await s.updateBalanceEntries("acc-1", "ethereum", [makeEntry({ id: "n1" })]);
    expect(await s.getBalances("acc-1", "testnet")).toHaveLength(1);
    expect(await s.getBalances("acc-1", "mainnet")).toHaveLength(0);
    expect(await s.getTotals("acc-1", "mainnet")).toHaveLength(0);
  });

  it("projects hot notes only for included-funds policy", async () => {
    const s = new MapStorage();
    const hot = makeEntry({ id: "hot-1", balance: 50n, finality: "hot" });
    await s.replaceHotOverlay(
      hotReplacement([
        {
          accountId: "acc-1",
          networkSlug: "ethereum",
          noteId: hot.id,
          status: "hot_available",
          balanceEntry: hot,
          origin: "external",
        },
      ]),
    );

    expect(await s.getProjectedBalances("acc-1", "ethereum", "finalized")).toEqual([]);
    expect((await s.getProjectedBalances("acc-1", "ethereum", "included")).map((entry) => entry.id)).toEqual(["hot-1"]);
  });

  it("clears stale hot projections for every account when the shared head changes", async () => {
    const s = new MapStorage();
    const first = hotReplacement([
      {
        accountId: "acc-1",
        networkSlug: "ethereum",
        noteId: "hot-1",
        status: "hot_available",
        balanceEntry: makeEntry({ id: "hot-1", finality: "hot" }),
        origin: "external",
      },
      {
        accountId: "acc-2",
        networkSlug: "ethereum",
        noteId: "hot-2",
        status: "hot_available",
        balanceEntry: makeEntry({ id: "hot-2", accountId: "acc-2", finality: "hot" }),
        origin: "external",
      },
    ]);
    await s.replaceHotOverlay(first);

    await s.replaceHotOverlay(hotReplacement([]));

    expect(await s.getHotNoteStates("acc-1", "ethereum")).toEqual([]);
    expect(await s.getHotNoteStates("acc-2", "ethereum")).toEqual([]);
  });

  it("keeps a hot-spent finalized note durable but removes it from spendable balance", async () => {
    const s = new MapStorage();
    const finalized = makeEntry({ id: "finalized-1", balance: 100n });
    await s.updateBalanceEntries("acc-1", "ethereum", [finalized]);
    await s.replaceHotOverlay(
      hotReplacement([
        {
          accountId: "acc-1",
          networkSlug: "ethereum",
          noteId: finalized.id,
          status: "finalized_spent_hot",
          balanceEntry: finalized,
          origin: "external",
        },
      ]),
    );

    expect(await s.getBalances("acc-1")).toHaveLength(1);
    expect(await s.getProjectedBalances("acc-1", "ethereum", "included")).toEqual([]);
    expect(await s.getBalanceBreakdown("acc-1", "ethereum", "0xusdc")).toEqual({
      finalizedAvailable: 0n,
      hotAvailable: 0n,
      pendingIncoming: 0n,
      lockedOutgoing: 100n,
      spendableAvailable: 0n,
    });
  });

  it("removes spent entries (total drops to zero so it is deleted)", async () => {
    const s = new MapStorage();
    await s.updateBalanceEntries("acc-1", "ethereum", [makeEntry({ id: "n1", balance: 100n })]);
    await s.removeSpentBalanceEntries([makeEntry({ id: "n1", balance: 100n })]);
    expect(await s.getTotals("acc-1")).toHaveLength(0);
  });

  it("removes ONLY the spent entries, preserving the account's other notes", async () => {
    const s = new MapStorage();
    const all = ["n0", "n1", "n2", "n3", "n4", "n5"].map((id) => makeEntry({ id, balance: 100n }));
    await s.updateBalanceEntries("acc-1", "ethereum", all);

    // Spend n2 — the other five notes MUST survive (regression: the old impl
    // passed only the spent entry to updateBalanceEntries, deleting all others).
    await s.removeSpentBalanceEntries([makeEntry({ id: "n2", balance: 100n })]);

    const remaining = await s.getBalances("acc-1");
    expect(remaining.map((e) => e.id).sort()).toEqual(["n0", "n1", "n3", "n4", "n5"]);
    // Total reflects only the survivors (5 × 100).
    expect((await s.getTotals("acc-1"))[0].totalBalance).toBe("500");
  });

  it("looks up currency metadata by address and by bigint vault token id", async () => {
    const s = new MapStorage();
    await s.upsertCurrencyMetadata(new Map([["0xusdc-ethereum", meta]]));

    expect((await s.getCurrencyMetadata("0xusdc", "ethereum")).symbol).toBe("USDC");
    expect((await s.getCurrencyMetadata(42n, "ethereum")).symbol).toBe("USDC");
    await expect(s.getCurrencyMetadata("0xmissing", "ethereum")).rejects.toThrow(/not found/);
    await expect(s.getCurrencyMetadata(999n, "ethereum")).rejects.toThrow(/not found/);
  });

  it("stores and reads price data", async () => {
    const s = new MapStorage();
    await s.upsertPriceData(new Map([["USDC", { price: "1.00", decimals: 6 }]]));
    expect((await s.getCurrencyPrice("USDC")).price).toBe("1.00");
    expect((await s.getPriceFeed()).size).toBe(1);
    await expect(s.getCurrencyPrice("NOPE")).rejects.toThrow(/not found/);
  });

  it("clears everything", async () => {
    const s = new MapStorage();
    await s.insertCurvyAccount(account);
    await s.updateBalanceEntries("acc-1", "ethereum", [makeEntry({ id: "n1" })]);
    await s.putNotesCheckpoint({
      networkSlug: "ethereum",
      environment: "mainnet",
      leafCount: 1,
      nullifierCount: 0,
      root: "5",
      blockNumber: 10,
      lastSynced: 1,
    });
    await s.appendCommittedLog("ethereum", "leaf", 0, ["5"]);
    await s.appendShardRoots("ethereum", 0, ["7"]);
    await s.putNoteWitness({
      networkSlug: "ethereum",
      noteId: "11",
      leafIndex: 0,
      shardIndex: 0,
      withinShardSiblings: null,
    });
    await s.putLiveShard({ networkSlug: "ethereum", startIndex: 0, leaves: ["11"] });
    await s.putTxHistory([makeTxHistoryEntry()]);
    await s.appendPrivateTokens("pp:relayer:chal", ["tok"]);
    await s.clearStorage();
    expect(s.stats()).toEqual({
      accounts: 0,
      balances: 0,
      totalBalances: 0,
      prices: 0,
      currencyMetadata: 0,
      notesCheckpoints: 0,
      logChunks: 0,
      shardRootsChunks: 0,
      noteWitnesses: 0,
      liveShards: 0,
      txHistory: 0,
      tokenPouches: 0,
      hotSyncStates: 0,
      hotBlocks: 0,
      hotNoteStates: 0,
      transferIntents: 0,
      transferAttempts: 0,
      transferSettlements: 0,
      intentDependencies: 0,
      finalityPreferences: 0,
    });
  });

  it("token pouch: FIFO take, count, and per-scope isolation", async () => {
    const s = new MapStorage();
    await s.appendPrivateTokens("pp:relayer:c1", ["a", "b"]);
    await s.appendPrivateTokens("pp:indexer:c2", ["z"]);

    expect(await s.countPrivateTokens("pp:relayer:c1")).toBe(2);
    expect(await s.takePrivateToken("pp:relayer:c1")).toBe("a");
    expect(await s.takePrivateToken("pp:relayer:c1")).toBe("b");
    expect(await s.takePrivateToken("pp:relayer:c1")).toBeUndefined();
    // The other scope is untouched.
    expect(await s.countPrivateTokens("pp:indexer:c2")).toBe(1);
  });

  it("round-trips the notes checkpoint per (networkSlug, environment); null when absent", async () => {
    const s = new MapStorage();
    expect(await s.getNotesCheckpoint("ethereum", "mainnet")).toBeNull();

    const checkpoint = {
      networkSlug: "ethereum",
      environment: "mainnet" as const,
      leafCount: 3,
      nullifierCount: 1,
      root: "12345",
      blockNumber: 99,
      lastSynced: 1234,
    };
    await s.putNotesCheckpoint(checkpoint);
    expect(await s.getNotesCheckpoint("ethereum", "mainnet")).toEqual(checkpoint);

    // distinct per environment; an upsert replaces in place
    expect(await s.getNotesCheckpoint("ethereum", "testnet")).toBeNull();
    await s.putNotesCheckpoint({ ...checkpoint, leafCount: 5 });
    expect((await s.getNotesCheckpoint("ethereum", "mainnet"))?.leafCount).toBe(5);
  });

  it("committed log appends incrementally, only touching the tail chunk (1024-leaf chunks)", async () => {
    const s = new MapStorage();
    expect(await s.getCommittedLogCount("ethereum", "leaf")).toBe(0);
    expect(await s.getCommittedLog("ethereum", "leaf")).toEqual([]);

    // Fill exactly one chunk + a partial second chunk across two appends.
    const first = Array.from({ length: 1024 }, (_, i) => String(i));
    await s.appendCommittedLog("ethereum", "leaf", 0, first);
    expect(s.stats().logChunks).toBe(1);

    await s.appendCommittedLog("ethereum", "leaf", 1024, ["1024", "1025", "1026"]);
    expect(s.stats().logChunks).toBe(2); // a second (partial) chunk; the first is untouched
    expect(await s.getCommittedLogCount("ethereum", "leaf")).toBe(1027);

    const log = await s.getCommittedLog("ethereum", "leaf");
    expect(log).toHaveLength(1027);
    expect(log[0]).toBe("0");
    expect(log[1023]).toBe("1023");
    expect(log[1026]).toBe("1026");

    // leaf and nullifier logs are independent
    await s.appendCommittedLog("ethereum", "nullifier", 0, ["999"]);
    expect(await s.getCommittedLog("ethereum", "nullifier")).toEqual(["999"]);
    expect(await s.getCommittedLogCount("ethereum", "leaf")).toBe(1027);
  });

  it("rejects a non-contiguous committed-log append", async () => {
    const s = new MapStorage();
    await s.appendCommittedLog("ethereum", "leaf", 0, ["a", "b"]);
    await expect(s.appendCommittedLog("ethereum", "leaf", 5, ["c"])).rejects.toThrow(/non-contiguous/);
  });
});

function makeWitness(overrides: Partial<SerializedNoteWitness> = {}): SerializedNoteWitness {
  return {
    networkSlug: "ethereum",
    noteId: "100",
    leafIndex: 0,
    shardIndex: 0,
    withinShardSiblings: null,
    ...overrides,
  };
}

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

describe("MapStorage — sharded notes tree", () => {
  it("shard roots are empty before the first append, then round-trip", async () => {
    const s = new MapStorage();
    expect(await s.getShardRoots("ethereum")).toEqual([]);

    await s.appendShardRoots("ethereum", 0, ["1", "2", "3"]);
    expect(await s.getShardRoots("ethereum")).toEqual(["1", "2", "3"]);
  });

  it("shard roots append incrementally from the cursor and only touch the tail chunk", async () => {
    const s = new MapStorage();

    // Fill exactly one chunk + a partial second chunk across two appends.
    const first = Array.from({ length: 1024 }, (_, i) => String(i));
    await s.appendShardRoots("ethereum", 0, first);
    expect(s.stats().shardRootsChunks).toBe(1);

    await s.appendShardRoots("ethereum", 1024, ["1024", "1025"]);
    expect(s.stats().shardRootsChunks).toBe(2); // a second (partial) chunk; the first is untouched

    const roots = await s.getShardRoots("ethereum");
    expect(roots).toHaveLength(1026);
    expect(roots[0]).toBe("0");
    expect(roots[1023]).toBe("1023");
    expect(roots[1025]).toBe("1025");
  });

  it("a zero-length shard-roots append is a no-op", async () => {
    const s = new MapStorage();
    await s.appendShardRoots("ethereum", 0, []);
    expect(await s.getShardRoots("ethereum")).toEqual([]);
    expect(s.stats().shardRootsChunks).toBe(0);
  });

  it("rejects a non-contiguous shard-roots append (gap in the cursor)", async () => {
    const s = new MapStorage();
    await s.appendShardRoots("ethereum", 0, ["a", "b"]);
    await expect(s.appendShardRoots("ethereum", 5, ["c"])).rejects.toThrow(/non-contiguous/);
    // The store is left untouched by the rejected append.
    expect(await s.getShardRoots("ethereum")).toEqual(["a", "b"]);
  });

  it("upserts a note witness, overwriting on a repeat noteId (shard freeze)", async () => {
    const s = new MapStorage();
    expect(await s.getNoteWitnesses("ethereum")).toEqual([]);

    // Insert at discovery — still live, no within-shard path yet.
    await s.putNoteWitness(makeWitness({ noteId: "100", withinShardSiblings: null }));
    let witnesses = await s.getNoteWitnesses("ethereum");
    expect(witnesses).toHaveLength(1);
    expect(witnesses[0].withinShardSiblings).toBeNull();

    // Update once at shard freeze — same noteId overwrites, not appends.
    await s.putNoteWitness(makeWitness({ noteId: "100", withinShardSiblings: ["7", "8"] }));
    witnesses = await s.getNoteWitnesses("ethereum");
    expect(witnesses).toHaveLength(1);
    expect(witnesses[0].withinShardSiblings).toEqual(["7", "8"]);
  });

  it("deletes a note witness (note spent)", async () => {
    const s = new MapStorage();
    await s.putNoteWitness(makeWitness({ noteId: "100" }));
    await s.putNoteWitness(makeWitness({ noteId: "200" }));
    expect(await s.getNoteWitnesses("ethereum")).toHaveLength(2);

    await s.deleteNoteWitness("ethereum", "100");
    const remaining = await s.getNoteWitnesses("ethereum");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].noteId).toBe("200");

    // Deleting a missing witness is a no-op (no throw).
    await expect(s.deleteNoteWitness("ethereum", "nope")).resolves.toBeUndefined();
  });

  it("live shard is null before the first put, then round-trips and is rewritten whole", async () => {
    const s = new MapStorage();
    expect(await s.getLiveShard("ethereum")).toBeNull();

    await s.putLiveShard({ networkSlug: "ethereum", startIndex: 0, leaves: ["1", "2"] });
    expect(await s.getLiveShard("ethereum")).toEqual({ networkSlug: "ethereum", startIndex: 0, leaves: ["1", "2"] });

    // A subsequent put rewrites the single record in place.
    await s.putLiveShard({ networkSlug: "ethereum", startIndex: 4, leaves: ["5", "6", "7"] });
    expect(await s.getLiveShard("ethereum")).toEqual({
      networkSlug: "ethereum",
      startIndex: 4,
      leaves: ["5", "6", "7"],
    });
  });

  it("isolates the sharded stores between networks (no cross-bleed)", async () => {
    const s = new MapStorage();

    await s.appendShardRoots("ethereum", 0, ["e1", "e2"]);
    await s.appendShardRoots("optimism", 0, ["o1"]);
    expect(await s.getShardRoots("ethereum")).toEqual(["e1", "e2"]);
    expect(await s.getShardRoots("optimism")).toEqual(["o1"]);

    await s.putNoteWitness(makeWitness({ networkSlug: "ethereum", noteId: "1" }));
    await s.putNoteWitness(makeWitness({ networkSlug: "optimism", noteId: "1" }));
    expect(await s.getNoteWitnesses("ethereum")).toHaveLength(1);
    expect(await s.getNoteWitnesses("optimism")).toHaveLength(1);

    // Same noteId on a different network is a distinct witness; deleting one
    // leaves the other intact.
    await s.deleteNoteWitness("ethereum", "1");
    expect(await s.getNoteWitnesses("ethereum")).toHaveLength(0);
    expect(await s.getNoteWitnesses("optimism")).toHaveLength(1);

    await s.putLiveShard({ networkSlug: "ethereum", startIndex: 0, leaves: ["e"] });
    await s.putLiveShard({ networkSlug: "optimism", startIndex: 0, leaves: ["o"] });
    expect((await s.getLiveShard("ethereum"))?.leaves).toEqual(["e"]);
    expect((await s.getLiveShard("optimism"))?.leaves).toEqual(["o"]);
  });
});

describe("MapStorage — transaction history", () => {
  it("is empty before the first put, then round-trips", async () => {
    const s = new MapStorage();
    expect(await s.getTxHistory("acc-1")).toEqual([]);

    const entry = makeTxHistoryEntry();
    await s.putTxHistory([entry]);
    expect(await s.getTxHistory("acc-1")).toEqual([entry]);
  });

  it("upserts by (accountId, id) — a re-sync overwrites rather than duplicates", async () => {
    const s = new MapStorage();

    await s.putTxHistory([makeTxHistoryEntry({ id: "ethereum:100:receive", amount: "100" })]);
    // Same id, different payload (e.g. leafIndex filled in on a later sync).
    await s.putTxHistory([makeTxHistoryEntry({ id: "ethereum:100:receive", amount: "100", leafIndex: 7 })]);

    const history = await s.getTxHistory("acc-1");
    expect(history).toHaveLength(1);
    expect(history[0].leafIndex).toBe(7);
  });

  it("returns entries newest-first by observedAt, tie-broken by id ascending", async () => {
    const s = new MapStorage();
    await s.putTxHistory([
      makeTxHistoryEntry({ id: "c", observedAt: 10 }),
      makeTxHistoryEntry({ id: "a", observedAt: 20 }),
      // Two entries share observedAt=15; the tie-break is id ascending (b before d).
      makeTxHistoryEntry({ id: "d", observedAt: 15 }),
      makeTxHistoryEntry({ id: "b", observedAt: 15 }),
    ]);

    expect((await s.getTxHistory("acc-1")).map((e) => e.id)).toEqual(["a", "b", "d", "c"]);
  });

  it("filters by networkSlug", async () => {
    const s = new MapStorage();
    await s.putTxHistory([
      makeTxHistoryEntry({ id: "ethereum:1:receive", networkSlug: "ethereum" }),
      makeTxHistoryEntry({ id: "optimism:1:receive", networkSlug: "optimism" }),
    ]);

    expect(await s.getTxHistory("acc-1")).toHaveLength(2);
    const eth = await s.getTxHistory("acc-1", { networkSlug: "ethereum" });
    expect(eth).toHaveLength(1);
    expect(eth[0].networkSlug).toBe("ethereum");
  });

  it("isolates history between accounts", async () => {
    const s = new MapStorage();
    // Same deterministic id on two accounts is a distinct entry per account.
    await s.putTxHistory([
      makeTxHistoryEntry({ id: "ethereum:1:receive", accountId: "acc-1" }),
      makeTxHistoryEntry({ id: "ethereum:1:receive", accountId: "acc-2" }),
    ]);

    expect(await s.getTxHistory("acc-1")).toHaveLength(1);
    expect(await s.getTxHistory("acc-2")).toHaveLength(1);
    expect(await s.getTxHistory("acc-3")).toEqual([]);
  });

  it("a zero-length put is a no-op", async () => {
    const s = new MapStorage();
    await s.putTxHistory([]);
    expect(s.stats().txHistory).toBe(0);
    expect(await s.getTxHistory("acc-1")).toEqual([]);
  });

  it("clearStorage wipes the history", async () => {
    const s = new MapStorage();
    await s.putTxHistory([makeTxHistoryEntry()]);
    expect(s.stats().txHistory).toBe(1);
    await s.clearStorage();
    expect(s.stats().txHistory).toBe(0);
    expect(await s.getTxHistory("acc-1")).toEqual([]);
  });
});

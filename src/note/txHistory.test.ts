import { describe, expect, it } from "vitest";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { fakeBalanceEntry } from "@/test/fixtures";
import type { OwnedNote } from "./discoverOwnedNotes";
import { reduceSyncToHistory, txHistoryId } from "./txHistory";

const base = {
  accountId: "acc-1",
  networkSlug: "ethereum",
  environment: NETWORK_ENVIRONMENT.MAINNET,
  now: 1_000,
};

const owned = (noteId: string, leafIndex: number): OwnedNote => ({
  noteId,
  leafIndex,
  amount: 100n,
  token: 1n,
  sharedSecret: 5n,
  ownerPub: [3n, 4n],
  ephemeralKey: [1n, 2n],
  viewTag: 0,
});

describe("reduceSyncToHistory", () => {
  it("emits receive entries, classifying deposit (plaintext) vs transfer (encrypted)", () => {
    const entries = reduceSyncToHistory({
      ...base,
      newOwned: [owned("11", 0), owned("22", 1)],
      newLeaves: [
        { index: 0, noteId: "11", isPlaintext: true, blockNumber: 7, requestTxHash: "0xreq" },
        { index: 1, noteId: "22", isPlaintext: false },
      ],
      spentEntries: [],
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      id: txHistoryId("ethereum", "11", "receive"),
      kind: "receive",
      origin: "deposit",
      amount: "100",
      token: "1",
      leafIndex: 0,
      requestTxHash: "0xreq",
      blockNumber: 7,
      observedAt: 1_000,
    });
    expect(entries[1]).toMatchObject({ origin: "transfer", noteId: "22" });
  });

  it("emits spend entries with amounts from the reconciled balance entries", () => {
    const spent = fakeBalanceEntry({ id: "777", balance: 500n, vaultTokenId: 9n, leafIndex: 42 });
    const entries = reduceSyncToHistory({ ...base, newOwned: [], newLeaves: [], spentEntries: [spent] });

    expect(entries).toEqual([
      expect.objectContaining({
        id: txHistoryId("ethereum", "777", "spend"),
        kind: "spend",
        noteId: "777",
        amount: "500",
        token: "9",
        leafIndex: 42,
      }),
    ]);
  });

  it("is deterministic: same pass → same ids (idempotent upserts)", () => {
    const params = { ...base, newOwned: [owned("11", 0)], newLeaves: [], spentEntries: [] };
    expect(reduceSyncToHistory(params).map((e) => e.id)).toEqual(reduceSyncToHistory(params).map((e) => e.id));
  });

  it("returns nothing for an empty pass", () => {
    expect(reduceSyncToHistory({ ...base, newOwned: [], newLeaves: [], spentEntries: [] })).toEqual([]);
  });
});

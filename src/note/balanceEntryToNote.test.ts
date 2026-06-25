import { describe, expect, it } from "vitest";
import type { BalanceEntry } from "@/types";
import { balanceEntryToNote } from "./balanceEntryToNote";

const owner = {
  babyJubjubPublicKey: { x: "1", y: "2" },
  sharedSecret: "3",
};

const deliveryTag = { ephemeralKey: "4.5", viewTag: "0x6" };

function makeEntry(overrides: Partial<BalanceEntry> = {}): BalanceEntry {
  return {
    accountId: "account-1",
    networkSlug: "ethereum",
    environment: "testnet",
    currencyAddress: "0xcurrency",
    vaultTokenId: 42n,
    symbol: "USDC",
    decimals: 6,
    balance: 1000n,
    lastUpdated: 0,
    source: "0xabc",
    id: "note-id",
    owner,
    deliveryTag,
    ...overrides,
  };
}

describe("balanceEntryToNote", () => {
  it("maps balance amount and vaultTokenId into the note amount/token", () => {
    const note = balanceEntryToNote(makeEntry());

    expect(note.amount).toBe(1000n);
    expect(note.token).toBe(42n);
  });

  it("maps owner and delivery tag onto the note", () => {
    const note = balanceEntryToNote(makeEntry());

    expect(note.owner.babyJubjubPublicKey.x).toBe(1n);
    expect(note.owner.babyJubjubPublicKey.y).toBe(2n);
    expect(note.owner.sharedSecret).toBe(3n);
    // "4.5" parses into the ephemeral point [4, 5]; "0x6" view tag → 6n.
    expect(note.ephemeralKey).toEqual([4n, 5n]);
    expect(note.viewTag).toBe(6n);
  });

  it("throws when vaultTokenId is missing", () => {
    expect(() => balanceEntryToNote(makeEntry({ vaultTokenId: null }))).toThrow(
      "vaultTokenId is required to convert NoteBalanceEntry to Note",
    );
  });
});

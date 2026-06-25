import { describe, expect, it } from "vitest";
import type { HexString } from "@/types";
import { Note } from "./note";
import { noteToBalanceEntry } from "./noteToBalanceEntry";

const metadata = {
  symbol: "USDC",
  decimals: 6,
  accountId: "account-1",
  environment: "testnet" as const,
  networkSlug: "ethereum",
  currencyAddress: "0xcurrency" as HexString,
};

function makeNote(): Note {
  return new Note({
    amount: 1000n,
    token: 42n,
    owner: {
      babyJubjubPublicKey: { x: 1n, y: 2n },
      sharedSecret: 3n,
    },
    ephemeralKey: [4n, 5n],
    viewTag: 6n,
  });
}

describe("noteToBalanceEntry", () => {
  it("maps note fields and merges in the provided metadata", () => {
    const note = makeNote();
    const entry = noteToBalanceEntry(note, metadata);

    expect(entry.symbol).toBe("USDC");
    expect(entry.decimals).toBe(6);
    expect(entry.accountId).toBe("account-1");
    expect(entry.environment).toBe("testnet");
    expect(entry.networkSlug).toBe("ethereum");
    expect(entry.currencyAddress).toBe("0xcurrency");

    expect(entry.id).toBe(note.id.toString());
    expect(entry.source).toBe(`0x${note.ownerHash.toString(16)}`);
    expect(entry.vaultTokenId).toBe(42n);
    expect(entry.balance).toBe(1000n);
    expect(typeof entry.lastUpdated).toBe("number");
  });

  it("serializes owner and delivery tag via serializeFullNote", () => {
    const note = makeNote();
    const entry = noteToBalanceEntry(note, metadata);
    const full = note.serializeFullNote();

    expect(entry.owner).toEqual(full.owner);
    expect(entry.deliveryTag).toEqual(full.deliveryTag);
  });
});

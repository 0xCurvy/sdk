import { describe, expect, it } from "vitest";
import type { BalanceEntry, HexString } from "@/types";
import { balanceEntryToNote } from "./balanceEntryToNote";
import { noteToBalanceEntry } from "./noteToBalanceEntry";

const metadata = {
  symbol: "USDC",
  decimals: 6,
  accountId: "account-1",
  environment: "testnet" as const,
  networkSlug: "ethereum",
  currencyAddress: "0xcurrency" as HexString,
};

const entry: BalanceEntry = {
  ...metadata,
  vaultTokenId: 42n,
  balance: 1000n,
  lastUpdated: 0,
  source: "0xabc",
  id: "ignored-id",
  owner: {
    babyJubjubPublicKey: { x: "1", y: "2" },
    sharedSecret: "3",
  },
  deliveryTag: { ephemeralKey: "4.5", viewTag: "0x6" },
};

describe("balanceEntryToNote <-> noteToBalanceEntry round-trip", () => {
  it("recovers balance, owner and delivery tag (ignoring lastUpdated)", () => {
    const note = balanceEntryToNote(entry);
    const recovered = noteToBalanceEntry(note, metadata);

    // Balance and token survive the round-trip.
    expect(recovered.balance).toBe(entry.balance);
    expect(recovered.vaultTokenId).toBe(entry.vaultTokenId);

    // Owner public key and shared secret survive the round-trip.
    expect(recovered.owner.babyJubjubPublicKey.x).toBe(entry.owner.babyJubjubPublicKey.x);
    expect(recovered.owner.babyJubjubPublicKey.y).toBe(entry.owner.babyJubjubPublicKey.y);
    expect(recovered.owner.sharedSecret).toBe(entry.owner.sharedSecret);

    // Delivery tag survives the round-trip (viewTag is zero-padded to ≥2 hex chars
    // so the Go-WASM scan's viewTag[:2] slice never sees a 1-char tag).
    expect(recovered.deliveryTag.ephemeralKey).toBe(entry.deliveryTag.ephemeralKey);
    expect(recovered.deliveryTag.viewTag).toBe("06");
  });

  it("produces a numeric lastUpdated regardless of the source value", () => {
    const note = balanceEntryToNote(entry);
    const recovered = noteToBalanceEntry(note, metadata);

    expect(typeof recovered.lastUpdated).toBe("number");
  });
});

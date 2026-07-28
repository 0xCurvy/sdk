import { poseidon2 } from "poseidon-lite";
import { describe, expect, it } from "vitest";
import type { OutputNote } from "@/note";
import { generateAggregationHash } from "./generateAggregationHash";
import { generateLegacyAggregationHash } from "./generateLegacyAggregationHash";

const makeOutputNote = (id: string, ephemeralKey: string): OutputNote => ({
  id,
  ownerHash: "1",
  balance: { amount: "1", token: "1" },
  deliveryTag: { ephemeralKey, viewTag: "00" },
});

describe("generateLegacyAggregationHash", () => {
  it("matches the v1 circuit's packed-ephemeral-key message", () => {
    const notes = [makeOutputNote("1", "1.2"), makeOutputNote("2", "3.4")];
    const outputNotesHash = poseidon2(notes.map((note) => BigInt(note.id)));
    const ephemeralKeyHash = poseidon2([(1n << 256n) | 2n, (3n << 256n) | 4n]);

    expect(generateLegacyAggregationHash(notes)).toBe(poseidon2([outputNotesHash, ephemeralKeyHash]));
  });

  it("is order-independent without mutating the request outputs", () => {
    const descending = [makeOutputNote("2", "3.4"), makeOutputNote("1", "1.2")];

    expect(generateLegacyAggregationHash(descending)).toBe(generateLegacyAggregationHash([...descending].reverse()));
    expect(descending.map((note) => note.id)).toEqual(["2", "1"]);
  });

  it("remains distinct from the v2 X/Y-binding hash", () => {
    const notes = [makeOutputNote("1", "1.2"), makeOutputNote("2", "3.4")];

    expect(generateLegacyAggregationHash(notes)).not.toBe(generateAggregationHash(notes));
  });
});

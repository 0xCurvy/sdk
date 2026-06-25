import { poseidon2 } from "poseidon-lite";
import { describe, expect, it } from "vitest";
import type { OutputNote } from "@/note";
import { generateAggregationHash } from "./generateAggregationHash";

const makeOutputNote = (id: string, ephemeralKey: string): OutputNote => ({
  id,
  ownerHash: "0x1",
  balance: { amount: "1", token: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" },
  deliveryTag: { ephemeralKey, viewTag: "0x0" },
});

// Two distinct valid decimal-string public keys (X.Y form).
const EK_A = "1.2";
const EK_B = "3.4";

describe("generateAggregationHash", () => {
  it("matches a manually recomputed poseidon aggregation hash", () => {
    const notes = [makeOutputNote("1", EK_A), makeOutputNote("2", EK_B)];

    const expectedOutputNotesHash = poseidon2(notes.map((n) => BigInt(n.id)));
    // X and Y hashed as separate field elements (per-note Poseidon([x, y])).
    const expectedEphemeralKeyHash = poseidon2(
      notes.map((n) => {
        const [x, y] = n.deliveryTag.ephemeralKey.split(".");
        return poseidon2([BigInt(x), BigInt(y)]);
      }),
    );
    const expected = poseidon2([expectedOutputNotesHash, expectedEphemeralKeyHash]);

    expect(generateAggregationHash([makeOutputNote("1", EK_A), makeOutputNote("2", EK_B)])).toBe(expected);
  });

  it("returns a bigint", () => {
    expect(typeof generateAggregationHash([makeOutputNote("1", EK_A)])).toBe("bigint");
  });

  it("is deterministic for the same input", () => {
    const build = () => [makeOutputNote("1", EK_A), makeOutputNote("2", EK_B)];
    expect(generateAggregationHash(build())).toBe(generateAggregationHash(build()));
  });

  it("is order-independent because notes are sorted by id", () => {
    const ascending = [makeOutputNote("1", EK_A), makeOutputNote("2", EK_B)];
    const descending = [makeOutputNote("2", EK_B), makeOutputNote("1", EK_A)];
    expect(generateAggregationHash(ascending)).toBe(generateAggregationHash(descending));
  });

  it("changes when an output note id changes", () => {
    const base = generateAggregationHash([makeOutputNote("1", EK_A), makeOutputNote("2", EK_B)]);
    const altered = generateAggregationHash([makeOutputNote("1", EK_A), makeOutputNote("3", EK_B)]);
    expect(altered).not.toBe(base);
  });

  it("changes when an ephemeral key changes", () => {
    const base = generateAggregationHash([makeOutputNote("1", EK_A), makeOutputNote("2", EK_B)]);
    const altered = generateAggregationHash([makeOutputNote("1", EK_A), makeOutputNote("2", "5.6")]);
    expect(altered).not.toBe(base);
  });
});

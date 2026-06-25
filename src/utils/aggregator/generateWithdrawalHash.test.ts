import { poseidon2 } from "poseidon-lite";
import { describe, expect, it } from "vitest";
import type { InputNote } from "@/note";
import type { HexString } from "@/types/helper";
import { generateWithdrawalHash } from "./generateWithdrawalHash";

const makeInputNote = (id: string): InputNote => ({
  id,
  nullifier: "0x0",
  owner: {
    babyJubjubPublicKey: { x: "1", y: "2" },
    sharedSecret: "3",
  },
  balance: { amount: "1", token: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" },
});

const DESTINATION: HexString = "0x1234567890123456789012345678901234567890";

describe("generateWithdrawalHash", () => {
  it("matches a manually recomputed poseidon withdrawal hash", () => {
    const notes = [makeInputNote("1"), makeInputNote("2")];

    const expectedInputNotesHash = poseidon2(notes.map((n) => BigInt(n.id)));
    const expected = poseidon2([expectedInputNotesHash, BigInt(DESTINATION)]);

    expect(generateWithdrawalHash([makeInputNote("1"), makeInputNote("2")], DESTINATION)).toBe(expected);
  });

  it("returns a bigint", () => {
    expect(typeof generateWithdrawalHash([makeInputNote("1")], DESTINATION)).toBe("bigint");
  });

  it("is deterministic for the same input", () => {
    const build = () => [makeInputNote("1"), makeInputNote("2")];
    expect(generateWithdrawalHash(build(), DESTINATION)).toBe(generateWithdrawalHash(build(), DESTINATION));
  });

  it("is order-independent because notes are sorted by id", () => {
    const ascending = [makeInputNote("1"), makeInputNote("2")];
    const descending = [makeInputNote("2"), makeInputNote("1")];
    expect(generateWithdrawalHash(ascending, DESTINATION)).toBe(generateWithdrawalHash(descending, DESTINATION));
  });

  it("changes when an input note id changes", () => {
    const base = generateWithdrawalHash([makeInputNote("1"), makeInputNote("2")], DESTINATION);
    const altered = generateWithdrawalHash([makeInputNote("1"), makeInputNote("3")], DESTINATION);
    expect(altered).not.toBe(base);
  });

  it("changes when the destination address changes", () => {
    const base = generateWithdrawalHash([makeInputNote("1"), makeInputNote("2")], DESTINATION);
    const altered = generateWithdrawalHash(
      [makeInputNote("1"), makeInputNote("2")],
      "0x0000000000000000000000000000000000000001",
    );
    expect(altered).not.toBe(base);
  });
});

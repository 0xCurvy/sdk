import { describe, expect, it } from "vitest";
import { fakeBalanceEntry } from "@/test/fixtures";
import type { BalanceEntry } from "@/types";
import { findMinSumSubset } from "./findMinSumSubset";

/** Build a labelled note with a given balance. */
const note = (id: string, balance: bigint): BalanceEntry => fakeBalanceEntry({ id, balance });

const sum = (notes: BalanceEntry[]): bigint => notes.reduce((acc, n) => acc + n.balance, 0n);

describe("findMinSumSubset", () => {
  it("returns a single note when it exactly matches the target", () => {
    const notes = [note("a", 30n), note("b", 100n), note("c", 70n)];

    const result = findMinSumSubset(notes, 100n);

    expect(result).not.toBeNull();
    expect(result!.map((n) => n.id)).toEqual(["b"]);
    expect(sum(result!)).toBe(100n);
  });

  it("combines notes to reach the target with minimum overshoot", () => {
    // 40 + 70 = 110 (overshoot 10) beats 40 + 90 / 70 + 90 for target 100
    const notes = [note("a", 40n), note("b", 70n), note("c", 90n)];

    const result = findMinSumSubset(notes, 100n);

    expect(result).not.toBeNull();
    expect(sum(result!)).toBeGreaterThanOrEqual(100n);
    expect(sum(result!)).toBe(110n);
    expect(result!.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("returns null when no subset can reach the target", () => {
    const notes = [note("a", 10n), note("b", 20n), note("c", 30n)];

    const result = findMinSumSubset(notes, 1000n);

    expect(result).toBeNull();
  });

  it("returns null (defers to greedy) when there are more than 30 notes", () => {
    const notes = Array.from({ length: 31 }, (_, i) => note(`n-${i}`, 5n));

    const result = findMinSumSubset(notes, 10n);

    expect(result).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { fakeBalanceEntry } from "@/test/fixtures";
import type { BalanceEntry } from "@/types";
import { selectOptimalBalances } from "./selectOptimalBalances";

/** Build a labelled note with a given balance. */
const note = (id: string, balance: bigint): BalanceEntry => fakeBalanceEntry({ id, balance });

const sum = (notes: BalanceEntry[]): bigint => notes.reduce((acc, n) => acc + n.balance, 0n);

describe("selectOptimalBalances", () => {
  it("returns the exact-match single note when one exists", () => {
    const notes = [note("a", 30n), note("b", 100n), note("c", 70n)];

    const result = selectOptimalBalances(notes, 100n);

    expect(result.map((n) => n.id)).toEqual(["b"]);
  });

  it("uses the smallest larger note when smaller notes cannot cover the target", () => {
    // smaller notes (10 + 20 = 30) < 100, so must pick the smallest single covering note
    const notes = [note("small-a", 10n), note("small-b", 20n), note("big", 150n), note("bigger", 300n)];

    const result = selectOptimalBalances(notes, 100n);

    expect(result.map((n) => n.id)).toEqual(["big"]);
  });

  it("selects the minimum-overshoot subset of smaller notes when they cover the target", () => {
    // smaller notes sum (40 + 70 = 110) >= 100, and no single larger note is cheaper
    const notes = [note("a", 40n), note("b", 70n), note("c", 500n)];

    const result = selectOptimalBalances(notes, 100n);

    expect(sum(result)).toBeGreaterThanOrEqual(100n);
    expect(sum(result)).toBe(110n);
    expect(result.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("throws when the total balance is insufficient to cover the target", () => {
    const notes = [note("a", 10n), note("b", 20n)];

    expect(() => selectOptimalBalances(notes, 1000n)).toThrow("Insufficient balance to cover the intended amount");
  });
});

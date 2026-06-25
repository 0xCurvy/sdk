import type { BalanceEntry } from "@/types";
import { findMinSumSubset } from "./findMinSumSubset";

/**
 * Select the cheapest set of balance notes that covers `target`, minimizing overshoot and input count.
 *
 * Prefers an exact-match single note, then the smallest single larger note, then a
 * minimum-sum subset of smaller notes (DP), falling back to a greedy selection.
 *
 * @example
 * const selected = selectOptimalBalances(balances, 100n);
 * // -> notes summing to >= 100n, throws if balances cannot cover the target
 *
 * @throws {Error} when the available balances are insufficient to cover the target.
 */
export const selectOptimalBalances = (balances: BalanceEntry[], target: bigint): BalanceEntry[] => {
  // 1. Exact match — zero overshoot, single input
  const exactMatch = balances.find((b) => b.balance === target);
  if (exactMatch) {
    return [exactMatch];
  }

  const smaller = balances.filter((b) => b.balance < target);
  const larger = balances.filter((b) => b.balance > target);

  // 2. Find the smallest single note that covers the target.
  //    A single note is extremely cheap: no multi-input aggregation rounds.
  larger.sort((a, b) => (a.balance > b.balance ? 1 : -1));
  const smallestLarger = larger.length > 0 ? larger[0] : null;

  const smallerSum = smaller.reduce((sum, b) => sum + b.balance, 0n);

  // If smaller notes can't cover target at all, we must use a larger note
  if (smallerSum < target) {
    if (smallestLarger) {
      return [smallestLarger];
    }
    throw new Error("Insufficient balance to cover the intended amount");
  }

  // 3. Use DP to find the minimum-sum subset of smaller notes that reaches target
  const dpResult = findMinSumSubset(smaller, target);

  if (dpResult) {
    // 4. Compare DP result against single larger note.
    //    Prefer single note when its overshoot <= DP overshoot,
    //    since 1 input avoids multi-round aggregation fees entirely.
    if (smallestLarger && smallestLarger.balance <= dpResult.reduce((s, b) => s + b.balance, 0n)) {
      return [smallestLarger];
    }
    return dpResult;
  }

  // 5. Fallback: greedy largest-first (only reached if DP was skipped for >30 notes)
  smaller.sort((a, b) => (a.balance < b.balance ? 1 : -1));
  const selected: BalanceEntry[] = [];
  let currentSum = 0n;

  for (const b of smaller) {
    selected.push(b);
    currentSum += b.balance;
    if (currentSum >= target) break;
  }

  if (smallestLarger && smallestLarger.balance <= currentSum) {
    return [smallestLarger];
  }

  return selected;
};

import type { BalanceEntry } from "@/types";

/**
 * Find the subset of `notes` whose sum is >= target with minimum overshoot.
 *
 * Uses bottom-up DP over reachable sums. Practical because note counts are small (< ~30).
 * Falls back to greedy (returns `null`) if the value space is too large.
 *
 * @example
 * const subset = findMinSumSubset(notes, 100n);
 * // -> subset of notes summing to >= 100n with the least overshoot, or null
 */
export const findMinSumSubset = (notes: BalanceEntry[], target: bigint): BalanceEntry[] | null => {
  // Guard: skip DP if there are too many notes (extremely unlikely in practice)
  if (notes.length > 30) {
    return null; // caller falls back to greedy
  }

  // DP state: map from reachable sum -> indices used to reach it
  // We only keep the best (lowest-sum) way to reach each "bin"
  // To keep memory bounded, we prune sums that overshoot target by more than the largest note
  const maxOvershoot = notes.reduce((max, b) => (b.balance > max ? b.balance : max), 0n);
  const ceiling = target + maxOvershoot;

  let reachable = new Map<bigint, number[]>();
  reachable.set(0n, []);

  let bestSum: bigint | null = null;
  let bestIndices: number[] | null = null;

  for (let i = 0; i < notes.length; i++) {
    const val = notes[i].balance;
    const nextReachable = new Map(reachable);

    for (const [sum, indices] of reachable) {
      const newSum = sum + val;

      // Prune sums way past target — they can't improve
      if (newSum > ceiling) continue;

      // Only keep this path if it's a new sum or uses fewer notes
      const existing = nextReachable.get(newSum);
      if (!existing || indices.length + 1 < existing.length) {
        nextReachable.set(newSum, [...indices, i]);
      }

      // Track best candidate >= target
      if (newSum >= target) {
        if (
          bestSum === null ||
          bestIndices === null ||
          newSum < bestSum ||
          (newSum === bestSum && indices.length + 1 < bestIndices.length)
        ) {
          bestSum = newSum;
          bestIndices = [...indices, i];
        }
      }
    }

    reachable = nextReachable;

    // Safety valve: if the map is growing too large, bail out to greedy
    if (reachable.size > 10_000) {
      return null;
    }

    // Early exit: exact match found
    if (bestSum === target) break;
  }

  if (bestIndices === null) return null;
  return bestIndices.map((i) => notes[i]);
};

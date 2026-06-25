import { describe, expect, it } from "vitest";
import type { PlanWalkResult } from "@/actions/planner/walkPlan";
import { mergeEstimates } from "./mergeEstimates";

describe("mergeEstimates", () => {
  it("sums estimates across successful parallel results", () => {
    const results: PlanWalkResult[] = [
      { success: true, estimate: { gasFeeInCurrency: 2n, curvyFeeInCurrency: 3n } },
      { success: true, estimate: { gasFeeInCurrency: 5n, curvyFeeInCurrency: 1n, bridgeFeeInCurrency: 9n } },
    ];
    const merged = mergeEstimates(results);
    expect(merged.gasFeeInCurrency).toBe(7n);
    expect(merged.curvyFeeInCurrency).toBe(4n);
    expect(merged.bridgeFeeInCurrency).toBe(9n);
  });

  it("skips failed results", () => {
    const results: PlanWalkResult[] = [
      { success: true, estimate: { gasFeeInCurrency: 2n, curvyFeeInCurrency: 3n } },
      { success: false, error: new Error("boom") },
    ];
    const merged = mergeEstimates(results);
    expect(merged.gasFeeInCurrency).toBe(2n);
    expect(merged.curvyFeeInCurrency).toBe(3n);
  });

  it("returns zeroed estimate when there are no results", () => {
    const merged = mergeEstimates([]);
    expect(merged.gasFeeInCurrency).toBe(0n);
    expect(merged.curvyFeeInCurrency).toBe(0n);
    expect(merged.bridgeFeeInCurrency).toBeUndefined();
  });
});

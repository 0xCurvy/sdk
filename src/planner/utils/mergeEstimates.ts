import type { PlanWalkResult } from "@/actions/planner/walkPlan";
import type { CommandEstimate } from "@/planner/types";
import { accumulateEstimate } from "./accumulateEstimate";

/**
 * Merges accumulated serial estimates for parallel nodes (pure module helper
 * moved out of `Planner`). Skips failed results.
 */
export function mergeEstimates(results: PlanWalkResult[]): CommandEstimate {
  const merged: CommandEstimate = { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n };
  for (const result of results) {
    if (result.success) accumulateEstimate(merged, result.estimate);
  }
  return merged;
}

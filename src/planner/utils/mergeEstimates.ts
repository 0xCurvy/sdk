import type { CommandEstimate, PlanResult } from "@/planner/types";
import { accumulateEstimate } from "./accumulateEstimate";

/** Merge successful branch estimates into one plan total. */
export function mergeEstimates<TPreparedPlan>(results: PlanResult<TPreparedPlan>[]): CommandEstimate {
  const merged: CommandEstimate = { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n };
  for (const result of results) {
    if (result.success) accumulateEstimate(merged, result.estimate);
  }
  return merged;
}

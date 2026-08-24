import type { CommandEstimate } from "@/planner/types";

/**
 * Add one command estimate to a serial-plan total. Mutates `target`.
 */
export function accumulateEstimate(target: CommandEstimate, source?: CommandEstimate): void {
  const { gasFeeInCurrency = 0n, curvyFeeInCurrency = 0n, bridgeFeeInCurrency = 0n, totalFeeInCurrency } = source || {};
  target.gasFeeInCurrency += gasFeeInCurrency;
  target.curvyFeeInCurrency += curvyFeeInCurrency;
  if (bridgeFeeInCurrency) {
    target.bridgeFeeInCurrency = (target.bridgeFeeInCurrency ?? 0n) + bridgeFeeInCurrency;
  }
  if (totalFeeInCurrency !== undefined) {
    target.totalFeeInCurrency = (target.totalFeeInCurrency ?? 0n) + totalFeeInCurrency;
  }
  if (source?.degradedToFeesOnAmount) target.degradedToFeesOnAmount = true;
}

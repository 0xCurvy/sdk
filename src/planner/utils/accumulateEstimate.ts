import type { CommandEstimate } from "@/planner/types";

/**
 * Sums all estimates from serial nodes into `target` (pure module helper moved
 * out of `Planner`). `bridgeFeeInCurrency` is treated as optional and only set
 * on `target` when at least one source contributes one.
 *
 * Mutates `target` in place (matching the legacy behaviour).
 */
export function accumulateEstimate(target: CommandEstimate, source?: CommandEstimate): void {
  const { gasFeeInCurrency = 0n, curvyFeeInCurrency = 0n, bridgeFeeInCurrency = 0n } = source || {};
  target.gasFeeInCurrency += gasFeeInCurrency;
  target.curvyFeeInCurrency += curvyFeeInCurrency;
  if (bridgeFeeInCurrency)
    if (!target.bridgeFeeInCurrency) target.bridgeFeeInCurrency = bridgeFeeInCurrency;
    else target.bridgeFeeInCurrency += bridgeFeeInCurrency;
}

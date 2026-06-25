import { describe, expect, it } from "vitest";
import type { CommandEstimate } from "@/planner/types";
import { accumulateEstimate } from "./accumulateEstimate";

describe("accumulateEstimate", () => {
  it("adds gas and curvy fees into the target", () => {
    const target: CommandEstimate = { gasFeeInCurrency: 10n, curvyFeeInCurrency: 5n };
    accumulateEstimate(target, { gasFeeInCurrency: 3n, curvyFeeInCurrency: 7n });
    expect(target.gasFeeInCurrency).toBe(13n);
    expect(target.curvyFeeInCurrency).toBe(12n);
    expect(target.bridgeFeeInCurrency).toBeUndefined();
  });

  it("treats a missing source as a zero contribution", () => {
    const target: CommandEstimate = { gasFeeInCurrency: 10n, curvyFeeInCurrency: 5n };
    accumulateEstimate(target, undefined);
    expect(target.gasFeeInCurrency).toBe(10n);
    expect(target.curvyFeeInCurrency).toBe(5n);
  });

  it("sets bridge fee on first contribution, then accumulates it", () => {
    const target: CommandEstimate = { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n };
    accumulateEstimate(target, { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n, bridgeFeeInCurrency: 4n });
    expect(target.bridgeFeeInCurrency).toBe(4n);
    accumulateEstimate(target, { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n, bridgeFeeInCurrency: 6n });
    expect(target.bridgeFeeInCurrency).toBe(10n);
  });

  it("does not introduce a bridge fee when none is contributed", () => {
    const target: CommandEstimate = { gasFeeInCurrency: 1n, curvyFeeInCurrency: 1n };
    accumulateEstimate(target, { gasFeeInCurrency: 1n, curvyFeeInCurrency: 1n, bridgeFeeInCurrency: 0n });
    expect(target.bridgeFeeInCurrency).toBeUndefined();
  });
});

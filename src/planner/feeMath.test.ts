import { describe, expect, it } from "vitest";
import { computeAggregateDelivery, computeAggregationTotals } from "./feeMath";

describe("computeAggregationTotals", () => {
  it("charges the proportional fee only on outputs that leave the sender", () => {
    const result = computeAggregationTotals({
      grossAmount: 10_000n,
      recipients: [
        { amount: 4_000n, isSender: true },
        { amount: 2_000n, isSender: false },
      ],
      commitmentFee: 20n,
      protocolFeePerThousand: 5n,
    });

    expect(result.spentToOthers).toBe(2_000n);
    expect(result.feeNoteAmount).toBe(30n);
    expect(result.spentToRecipients + result.feeNoteAmount + result.changeAmount).toBe(result.grossAmount);
  });
});

describe("computeAggregateDelivery", () => {
  it("preserves a requested amount when the inputs cover all fees", () => {
    const result = computeAggregateDelivery({
      grossAmount: 10_000n,
      requestedAmount: 8_000n,
      recipientIsSender: false,
      additionalRecipients: [{ amount: 100n, isSender: false }],
      commitmentFee: 20n,
      protocolFeePerThousand: 5n,
    });

    expect(result.deliveredAmount).toBe(8_000n);
    expect(result.degradedToFeesOnAmount).toBe(false);
    expect(result.deliveredAmount + 100n + result.feeNoteAmount + result.changeAmount).toBe(10_000n);
  });

  it("maximizes delivery without making change negative", () => {
    const result = computeAggregateDelivery({
      grossAmount: 10_000n,
      requestedAmount: 10_000n,
      recipientIsSender: false,
      additionalRecipients: [{ amount: 100n, isSender: false }],
      commitmentFee: 20n,
      protocolFeePerThousand: 5n,
    });

    expect(result.degradedToFeesOnAmount).toBe(true);
    expect(result.changeAmount).toBeLessThanOrEqual(1n);
    expect(result.deliveredAmount + 100n + result.feeNoteAmount + result.changeAmount).toBe(10_000n);
  });

  it("maximizes an intermediate self-fold while charging fixed external outputs", () => {
    const result = computeAggregateDelivery({
      grossAmount: 1_000n,
      recipientIsSender: true,
      additionalRecipients: [{ amount: 10n, isSender: false }],
      commitmentFee: 5n,
      protocolFeePerThousand: 10n,
    });

    expect(result.deliveredAmount + 10n + result.feeNoteAmount + result.changeAmount).toBe(1_000n);
    expect(result.changeAmount).toBe(0n);
  });

  it("rejects fixed costs that exceed the inputs", () => {
    expect(() =>
      computeAggregateDelivery({
        grossAmount: 100n,
        recipientIsSender: false,
        additionalRecipients: [{ amount: 100n, isSender: false }],
        commitmentFee: 1n,
        protocolFeePerThousand: 0n,
      }),
    ).toThrow(RangeError);
  });
});

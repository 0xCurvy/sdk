export type AggregationAllocationRecipient = {
  amount: bigint;
  /** Whether the output is owned by the input-note owner. */
  isSender: boolean;
};

export type AggregationTotals = {
  grossAmount: bigint;
  spentToRecipients: bigint;
  spentToOthers: bigint;
  commitmentFee: bigint;
  proportionalProtocolFee: bigint;
  feeNoteAmount: bigint;
  changeAmount: bigint;
};

export type ComputeAggregationTotalsParameters = {
  grossAmount: bigint;
  recipients: readonly AggregationAllocationRecipient[];
  commitmentFee: bigint;
  protocolFeePerThousand: bigint;
};

const assertNonNegative = (name: string, value: bigint): void => {
  if (value < 0n) throw new RangeError(`${name} must be non-negative`);
};

/** Compute the aggregation circuit's conservation equation for exact recipient outputs. */
export function computeAggregationTotals(parameters: ComputeAggregationTotalsParameters): AggregationTotals {
  const { grossAmount, recipients, commitmentFee, protocolFeePerThousand } = parameters;
  assertNonNegative("grossAmount", grossAmount);
  assertNonNegative("commitmentFee", commitmentFee);
  assertNonNegative("protocolFeePerThousand", protocolFeePerThousand);
  for (const recipient of recipients) assertNonNegative("recipient amount", recipient.amount);

  const spentToRecipients = recipients.reduce((total, recipient) => total + recipient.amount, 0n);
  const spentToOthers = recipients
    .filter((recipient) => !recipient.isSender)
    .reduce((total, recipient) => total + recipient.amount, 0n);
  const proportionalProtocolFee = (spentToOthers * protocolFeePerThousand) / 1000n;
  const feeNoteAmount = commitmentFee + proportionalProtocolFee;

  return {
    grossAmount,
    spentToRecipients,
    spentToOthers,
    commitmentFee,
    proportionalProtocolFee,
    feeNoteAmount,
    changeAmount: grossAmount - spentToRecipients - feeNoteAmount,
  };
}

export type ComputeAggregateDeliveryParameters = Omit<ComputeAggregationTotalsParameters, "recipients"> & {
  /** Omit to deliver the maximum spendable amount. */
  requestedAmount?: bigint;
  recipientIsSender: boolean;
  /** Fixed outputs such as the relay-operator reimbursement note. */
  additionalRecipients?: readonly AggregationAllocationRecipient[];
};

export type AggregateDelivery = AggregationTotals & {
  deliveredAmount: bigint;
  degradedToFeesOnAmount: boolean;
};

/** Find the largest recipient output that satisfies the circuit's integer fee equation. */
export function computeAggregateDelivery(parameters: ComputeAggregateDeliveryParameters): AggregateDelivery {
  const {
    grossAmount,
    requestedAmount,
    recipientIsSender,
    additionalRecipients = [],
    commitmentFee,
    protocolFeePerThousand,
  } = parameters;
  assertNonNegative("grossAmount", grossAmount);
  if (requestedAmount !== undefined) assertNonNegative("requestedAmount", requestedAmount);

  let low = 0n;
  let high =
    requestedAmount === undefined ? grossAmount : requestedAmount < grossAmount ? requestedAmount : grossAmount;
  let deliveredAmount = -1n;
  let totals: AggregationTotals | undefined;

  while (low <= high) {
    const candidate = (low + high) / 2n;
    const candidateTotals = computeAggregationTotals({
      grossAmount,
      commitmentFee,
      protocolFeePerThousand,
      recipients: [{ amount: candidate, isSender: recipientIsSender }, ...additionalRecipients],
    });
    if (candidateTotals.changeAmount >= 0n) {
      deliveredAmount = candidate;
      totals = candidateTotals;
      low = candidate + 1n;
    } else {
      high = candidate - 1n;
    }
  }

  if (!totals || deliveredAmount < 0n) {
    throw new RangeError("aggregation inputs cannot cover the fixed recipient outputs and fees");
  }

  return {
    ...totals,
    deliveredAmount,
    degradedToFeesOnAmount: requestedAmount !== undefined && deliveredAmount < requestedAmount,
  };
}

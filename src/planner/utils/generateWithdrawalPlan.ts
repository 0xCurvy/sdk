import { v4 as uuidV4 } from "uuid";
import type { DraftPlan, ExternalTransferIntent, SwapIntent } from "@/planner/types";
import type { BalanceEntry } from "@/types";
import { deliveryWaitNodes } from "./deliveryWaitNodes";
import { generateAggregationPlan } from "./generateAggregationPlan";

function foldToWithdrawalLimit(nodes: DraftPlan[], maxInputs: number): DraftPlan {
  if (nodes.length < 1) throw new Error("A withdrawal requires at least one input note.");
  if (nodes.length <= maxInputs) return { type: "parallel", items: nodes };

  const foldedCount = nodes.length - maxInputs + 1;
  return {
    type: "parallel",
    items: [generateAggregationPlan(nodes.slice(0, foldedCount), maxInputs), ...nodes.slice(foldedCount)],
  };
}

/** Build aggregation, withdrawal, and delivery milestones for a public payout. */
export function generateWithdrawalPlan(
  inputs: DraftPlan[],
  selectedBalances: BalanceEntry[],
  intent: ExternalTransferIntent | SwapIntent,
  dependencies: { maxInputs: number; shieldSettleDelayMs?: number },
): DraftPlan {
  const selectedAmount = selectedBalances.reduce((total, balance) => total + balance.balance, 0n);
  const mustCarveRequestedAmount = selectedAmount > intent.amount || inputs.length > dependencies.maxInputs;
  const spendInputs = mustCarveRequestedAmount
    ? generateAggregationPlan(inputs, dependencies.maxInputs, intent)
    : foldToWithdrawalLimit(inputs, dependencies.maxInputs);

  return {
    type: "serial",
    items: [
      spendInputs,
      {
        type: "command",
        id: uuidV4(),
        kind: "aggregator-withdraw",
        intent,
      },
      ...deliveryWaitNodes(intent, dependencies.shieldSettleDelayMs),
    ],
  };
}

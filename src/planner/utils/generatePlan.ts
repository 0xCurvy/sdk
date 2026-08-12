import type { DraftPlan, GeneratePlanReturnType, Intent } from "@/planner/types";
import type { BalanceEntry } from "@/types";
import { generateTransferPlan } from "./generateTransferPlan";
import { generateWithdrawalPlan } from "./generateWithdrawalPlan";
import { selectOptimalBalances } from "./selectOptimalBalances";

/**
 * Protocol inputs required to generate a plan without performing IO.
 */
export type GeneratePlanDeps = {
  /** Aggregation circuit `maxInputs` (protocol-global; from `config.state.protocol`). */
  maxInputs: number;
  /** Destination settlement delay applied after the entry portal appears. */
  shieldSettleDelayMs?: number;
};

/**
 * Select spendable notes and build the draft route for an intent.
 *
 * @example
 * const { plan, usedBalances } = generatePlan(balances, intent, { maxInputs });
 * // -> draft plan tree plus the balance notes it consumes
 */
export const generatePlan = (
  balances: BalanceEntry[],
  intent: Intent,
  deps: GeneratePlanDeps,
): GeneratePlanReturnType => {
  const selectedBalances = selectOptimalBalances(balances, intent.amount);

  const inputDataNodes: DraftPlan[] = selectedBalances.map((balanceEntry) => ({
    type: "data",
    data: [balanceEntry],
  }));

  let plan: DraftPlan;
  switch (intent.type) {
    case "external-transfer":
    case "curvy-swap":
      plan = generateWithdrawalPlan(inputDataNodes, selectedBalances, intent, deps);
      break;
    case "curvy-transfer":
    case "send-to-anyone":
      plan = generateTransferPlan(inputDataNodes, intent, deps.maxInputs);
      break;
  }

  return { plan, usedBalances: selectedBalances };
};

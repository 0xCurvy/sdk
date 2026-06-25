import { v4 as uuidV4 } from "uuid";
import type { DraftPlan, GeneratePlanReturnType, Intent } from "@/planner/types";
import type { BalanceEntry } from "@/types";
import type { Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import { isHexString } from "@/types/helper";
import { invariant } from "@/utils/invariant";
import { generateAggregationPlan } from "./generateAggregationPlan";
import { selectOptimalBalances } from "./selectOptimalBalances";

/**
 * Injected dependencies for `generatePlan`. `checkBytecode` is the seam that
 * lets the planner detect when a portal contract has been deployed without the
 * util depending on a concrete SDK/config — the functional layer passes a
 * `config`-bound `hasBytecode`, the legacy layer passes an `sdk`-bound one.
 */
export type GeneratePlanDeps = {
  checkBytecode: (network: Network, address: HexString) => Promise<boolean>;
};

/**
 * Fold the selected input nodes down to EXACTLY `maxInputs` notes for a withdrawal.
 *
 * The v3 withdrawal circuit verifies inclusion of every input slot (no skip-pad),
 * so it needs exactly `maxInputs` real committed notes. We aggregate the excess —
 * the first `count - maxInputs + 1` notes are folded (to self) into one, and the
 * remaining `maxInputs - 1` notes pass through — so the resulting `parallel` node
 * yields exactly `maxInputs` committed balance entries for the withdraw command.
 */
const foldToMaxInputs = (nodes: DraftPlan[], maxInputs: number): DraftPlan => {
  if (nodes.length < maxInputs) {
    throw new Error(`withdrawal needs at least ${maxInputs} committed input notes; selected ${nodes.length}`);
  }
  if (nodes.length === maxInputs) {
    return { type: "parallel", items: nodes };
  }
  const headCount = nodes.length - maxInputs + 1;
  const head = nodes.slice(0, headCount);
  const tail = nodes.slice(headCount);
  // `generateAggregationPlan(head, maxInputs)` (no intent) folds the head to ONE self note.
  return { type: "parallel", items: [generateAggregationPlan(head, maxInputs), ...tail] };
};

/**
 * Build the full draft plan for an intent: select inputs, then withdraw/transfer.
 *
 * @example
 * const { plan, usedBalances } = generatePlan(balances, intent, { checkBytecode });
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
    data: balanceEntry,
  }));

  const recipientIsHex = isHexString(intent.recipient);
  const maxInputs = intent.network.aggregationCircuitConfig?.maxInputs;
  invariant(maxInputs, "Network does not support aggregation, missing aggregationCircuitConfig or maxInputs");

  let plan: DraftPlan;

  if (recipientIsHex) {
    // Withdrawal: fold to exactly maxInputs committed notes, then pay out.
    plan = {
      type: "serial",
      items: [
        foldToMaxInputs(inputDataNodes, maxInputs),
        {
          type: "command",
          id: uuidV4(),
          name: "aggregator-withdraw",
          intent,
        },
      ],
    };
    switch (intent.type) {
      case "external-transfer": {
        // Wait for the broadcaster to deploy the exit portal contract, which is the
        // on-chain signal that the bridge and/or swap leg is underway. Applies whenever
        // the recipient is an exit portal — either because we're bridging to another
        // network (`exitNetwork` set) or swapping to a different currency on the same
        // network (`exitCurrency` set). For plain external transfers (no exit portal),
        // the recipient is the user's address directly and no wait is needed.
        if (intent.exitNetwork || intent.exitCurrency) {
          plan.items.push({
            type: "wait",
            name: "Confirming delivery",
            id: uuidV4(),
            condition: () => {
              return deps.checkBytecode(intent.network, intent.recipient);
            },
          });
        }
        break;
      }
      case "curvy-swap": {
        plan.items.push(
          {
            type: "wait",
            name: "Confirming swap completion",
            id: uuidV4(),
            condition: () => {
              return deps.checkBytecode(intent.network, intent.recipient);
            },
          },
          {
            type: "wait",
            name: "Confirming shield into Curvy",
            id: uuidV4(),
            condition: async () => {
              const isShieldPortalDeployed = await deps.checkBytecode(intent.network, intent.entryAddress);
              if (!isShieldPortalDeployed) {
                return isShieldPortalDeployed;
              }

              // TODO add events on contract
              // If the shield portal is deployed, we wait for 10 seconds to allow the shield (commitDepositBatch) to complete.
              // This is a temporary solution until we implement events for aggregator actions
              await new Promise((res) => setTimeout(res, 10 * 10 ** 3));
              return isShieldPortalDeployed;
            },
          },
        );
        break;
      }
    }
  } else {
    // curvy-transfer / send-to-anyone: fold to a single note owned by the recipient.
    plan = generateAggregationPlan(inputDataNodes, maxInputs, intent);
  }

  return { plan, usedBalances: selectedBalances };
};

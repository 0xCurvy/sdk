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
 * Fold the selected input nodes down to AT MOST `maxInputs` notes for a withdrawal.
 *
 * The v3 withdrawal circuit is skip-aware (zero-amount input slots are skipped, same
 * as aggregation), so the withdraw builder accepts 1..maxInputs real committed notes
 * and zero-pads the rest. So 1..maxInputs notes pass straight through; only an EXCESS
 * is folded — the first `count - maxInputs + 1` notes aggregate (to self) into one and
 * the remaining `maxInputs - 1` pass through — yielding ≤ `maxInputs` committed balance
 * entries for the withdraw command.
 */
const foldToMaxInputs = (nodes: DraftPlan[], maxInputs: number): DraftPlan => {
  if (nodes.length < 1) {
    throw new Error("withdrawal needs at least 1 committed input note; selected 0");
  }
  if (nodes.length <= maxInputs) {
    // 1..maxInputs real notes — the withdraw builder zero-pads the unused slots.
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
    // The withdrawal circuit pays out the FULL amount of its input notes — it has
    // no change output. `selectOptimalBalances` overshoots the target, so when the
    // selected notes exceed `intent.amount` we must FIRST carve out exactly
    // `intent.amount` into a self note (an aggregation; the remainder becomes change
    // back to self), then withdraw that note — otherwise the overshoot would be paid
    // to the recipient. An exact selection withdraws its notes directly.
    const selectedSum = selectedBalances.reduce((sum, b) => sum + b.balance, 0n);
    // A fold is UNAVOIDABLE when the selection exceeds the withdrawal circuit's
    // maxInputs: `foldToMaxInputs` would self-fold the excess WITHOUT carving the
    // intent amount, and that fold burns a gas fee — so the surviving committed notes
    // sum to LESS than `intent.amount` and the recipient is silently underpaid. Route
    // such cases through the carve path too (even on an exact-sum selection): the final
    // aggregation carves `intent.amount` into the recipient note (degrading to
    // fees-on-amount when there's no headroom), so the deliverable is accurate.
    const needsFold = inputDataNodes.length > maxInputs;
    const inputStep =
      selectedSum > intent.amount || needsFold
        ? generateAggregationPlan(inputDataNodes, maxInputs, intent)
        : foldToMaxInputs(inputDataNodes, maxInputs);

    plan = {
      type: "serial",
      items: [
        inputStep,
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

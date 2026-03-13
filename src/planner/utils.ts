import { v4 as uuidV4 } from "uuid";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyIntent, CurvyPlanFlowControl, DraftPlan, GeneratePlanReturnType } from "@/planner/type";
import type { BalanceEntry } from "@/types";
import { isHexString } from "@/types/helper";
import { hasBytecode } from "@/utils";

/**
 * Find the subset of `smaller` notes whose sum is >= target with minimum overshoot.
 * Uses bottom-up DP over reachable sums. Practical because note counts are small (< ~30).
 * Falls back to greedy if the value space is too large.
 */
const findMinSumSubset = (notes: BalanceEntry[], target: bigint): BalanceEntry[] | null => {
  // Guard: skip DP if there are too many notes (extremely unlikely in practice)
  if (notes.length > 30) {
    return null; // caller falls back to greedy
  }

  // DP state: map from reachable sum -> indices used to reach it
  // We only keep the best (lowest-sum) way to reach each "bin"
  // To keep memory bounded, we prune sums that overshoot target by more than the largest note
  const maxOvershoot = notes.reduce((max, b) => (b.balance > max ? b.balance : max), 0n);
  const ceiling = target + maxOvershoot;

  let reachable = new Map<bigint, number[]>();
  reachable.set(0n, []);

  let bestSum: bigint | null = null;
  let bestIndices: number[] | null = null;

  for (let i = 0; i < notes.length; i++) {
    const val = notes[i].balance;
    const nextReachable = new Map(reachable);

    for (const [sum, indices] of reachable) {
      const newSum = sum + val;

      // Prune sums way past target — they can't improve
      if (newSum > ceiling) continue;

      // Only keep this path if it's a new sum or uses fewer notes
      const existing = nextReachable.get(newSum);
      if (!existing || indices.length + 1 < existing.length) {
        nextReachable.set(newSum, [...indices, i]);
      }

      // Track best candidate >= target
      if (newSum >= target) {
        if (bestSum === null || newSum < bestSum || (newSum === bestSum && indices.length + 1 < bestIndices!.length)) {
          bestSum = newSum;
          bestIndices = [...indices, i];
        }
      }
    }

    reachable = nextReachable;

    // Safety valve: if the map is growing too large, bail out to greedy
    if (reachable.size > 10_000) {
      return null;
    }

    // Early exit: exact match found
    if (bestSum === target) break;
  }

  if (bestIndices === null) return null;
  return bestIndices.map((i) => notes[i]);
};

const selectOptimalBalances = (balances: BalanceEntry[], target: bigint): BalanceEntry[] => {
  // 1. Exact match — zero overshoot, single input
  const exactMatch = balances.find((b) => b.balance === target);
  if (exactMatch) {
    return [exactMatch];
  }

  const smaller = balances.filter((b) => b.balance < target);
  const larger = balances.filter((b) => b.balance > target);

  // 2. Find the smallest single note that covers the target.
  //    A single note is extremely cheap: no multi-input aggregation rounds.
  larger.sort((a, b) => (a.balance > b.balance ? 1 : -1));
  const smallestLarger = larger.length > 0 ? larger[0] : null;

  const smallerSum = smaller.reduce((sum, b) => sum + b.balance, 0n);

  // If smaller notes can't cover target at all, we must use a larger note
  if (smallerSum < target) {
    if (smallestLarger) {
      return [smallestLarger];
    }
    throw new Error("Insufficient balance to cover the intended amount");
  }

  // 3. Use DP to find the minimum-sum subset of smaller notes that reaches target
  const dpResult = findMinSumSubset(smaller, target);

  if (dpResult) {
    // 4. Compare DP result against single larger note.
    //    Prefer single note when its overshoot <= DP overshoot,
    //    since 1 input avoids multi-round aggregation fees entirely.
    if (smallestLarger && smallestLarger.balance <= dpResult.reduce((s, b) => s + b.balance, 0n)) {
      return [smallestLarger];
    }
    return dpResult;
  }

  // 5. Fallback: greedy largest-first (only reached if DP was skipped for >30 notes)
  smaller.sort((a, b) => (a.balance < b.balance ? 1 : -1));
  const selected: BalanceEntry[] = [];
  let currentSum = 0n;

  for (const b of smaller) {
    selected.push(b);
    currentSum += b.balance;
    if (currentSum >= target) break;
  }

  if (smallestLarger && smallestLarger.balance <= currentSum) {
    return [smallestLarger];
  }

  return selected;
};

const generateAggregationPlan = (items: DraftPlan[], intent: CurvyIntent): DraftPlan => {
  const maxInputs = intent.network.aggregationCircuitConfig?.maxInputs;

  if (!maxInputs) {
    throw new Error("Network does not support aggregation, missing aggregationCircuitConfig or maxInputs");
  }

  // If we have just one sub plan, just aggregate it
  if (items.length === 1) {
    return {
      type: "serial",
      name: "Privacy Aggregation",
      description: "Aggregating Funds",
      items: [
        items[0],
        {
          type: "command",
          id: uuidV4(),
          name: "aggregator-aggregate",
          intent,
        },
      ],
    };
  }

  while (items.length > 1) {
    const nextLevel = [];

    for (let i = 0; i < items.length; i += maxInputs) {
      const children = items.slice(i, i + maxInputs);

      const nextLevelItems: DraftPlan[] = [];

      if (children.length === 1) {
        nextLevelItems.push(children[0]);
      } else {
        nextLevelItems.push(
          {
            type: "parallel",
            items: children,
          },
          {
            type: "command",
            id: uuidV4(),
            name: "aggregator-aggregate",
          },
        );
      }

      nextLevel.push({
        type: "serial",
        name: items.length > Math.max(1, maxInputs) ? undefined : "Privacy Aggregation",
        description: items.length > Math.max(1, maxInputs) ? undefined : "Aggregating Funds",
        items: nextLevelItems,
      });
    }

    items = nextLevel as DraftPlan[]; // Move up one level
  }

  const aggregationPlan = items[0] as CurvyPlanFlowControl;

  if (aggregationPlan.items.length !== 2) {
    throw new Error("Unexpected number of items in aggregation plan");
  }

  if (aggregationPlan.items[1].type !== "command" || aggregationPlan.items[1].name !== "aggregator-aggregate") {
    throw new Error("Last item in aggregation plan is not an aggregation command");
  }

  // We pass the intent to the last aggregation.
  // The aggregator-aggregate will use the intent's amount as a signal for how much to keep as change
  // And if the `intent.toAddress` is a Curvy handle, it will use it to derive recipients new Note.
  aggregationPlan.items[1].intent = intent;

  return aggregationPlan;
};

export const generatePlan = (sdk: ICurvySDK, balances: BalanceEntry[], intent: CurvyIntent): GeneratePlanReturnType => {
  const selectedBalances = selectOptimalBalances(balances, intent.amount);

  const inputDataNodes: DraftPlan[] = selectedBalances.map((balanceEntry) => ({
    type: "data",
    data: balanceEntry,
  }));

  const totalSelectedSum = selectedBalances.reduce((sum, b) => sum + b.balance, 0n);
  const recipientIsHex = isHexString(intent.recipient);

  let aggregationPlan: DraftPlan;

  if (recipientIsHex && totalSelectedSum === intent.amount && inputDataNodes.length === 1) {
    // Exact amount with a single note
    aggregationPlan = inputDataNodes[0];
  } else {
    // Need to aggregate to get the exact amount output (plus change note)
    aggregationPlan = generateAggregationPlan(inputDataNodes, intent);
  }

  // All we have to do now is batch all the serial plans inside the planLeadingUpToAggregation
  // into aggregator supported batch sizes

  let plan: DraftPlan;

  if (recipientIsHex) {
    plan = {
      type: "serial",
      items: [
        aggregationPlan,
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
        if (intent.exitNetwork) {
          plan.items.push({
            type: "wait",
            name: "Confirming bridge completion",
            id: uuidV4(),
            condition: () => {
              return hasBytecode(sdk, intent.network, intent.recipient);
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
              return hasBytecode(sdk, intent.network, intent.recipient);
            },
          },
          {
            type: "wait",
            name: "Confirming shield into Curvy",
            id: uuidV4(),
            condition: async () => {
              const isShieldPortalDeployed = hasBytecode(sdk, intent.network, intent.entryAddress);
              if (!isShieldPortalDeployed) {
                return isShieldPortalDeployed;
              }

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
    plan = aggregationPlan;
  }

  return { plan, usedBalances: selectedBalances };
};

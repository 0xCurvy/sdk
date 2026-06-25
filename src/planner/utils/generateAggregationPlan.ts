import { v4 as uuidV4 } from "uuid";
import type { DraftPlan, Intent, PlanFlowControl } from "@/planner/types";
import { invariant } from "@/utils/invariant";

/**
 * Build the aggregation sub-plan that folds the given input plans into a single aggregated note.
 *
 * Batches inputs into `maxInputs`-sized rounds, recursing up the tree until a single
 * aggregation remains. When `intent` is provided it is attached to the final aggregation
 * (the recipient/amount-bearing step); when omitted, every aggregation is an intermediate
 * SELF-fold (used by the withdrawal path, which folds excess inputs to self before paying out).
 *
 * @example
 * const plan = generateAggregationPlan([dataNodeA, dataNodeB], 2, intent);
 * // -> a serial/parallel tree whose final command is "aggregator-aggregate"
 *
 * @throws {Error} when `maxInputs` is missing/zero.
 */
export const generateAggregationPlan = (items: DraftPlan[], maxInputs: number, intent?: Intent): DraftPlan => {
  invariant(maxInputs, "Network does not support aggregation, missing aggregationCircuitConfig or maxInputs");

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

  const aggregationPlan = items[0] as PlanFlowControl;

  invariant(aggregationPlan.items.length === 2, "Unexpected number of items in aggregation plan");
  invariant(
    aggregationPlan.items[1].type === "command" && aggregationPlan.items[1].name === "aggregator-aggregate",
    "Last item in aggregation plan is not an aggregation command",
  );

  // Pass the intent to the last aggregation (the recipient/amount-bearing step).
  // The aggregator-aggregate uses the intent's amount as a signal for how much to keep
  // as change, and (if the recipient is a Curvy handle) to derive the recipient's note.
  // Omitted intent => a pure self-fold (the withdrawal path).
  if (intent) {
    aggregationPlan.items[1].intent = intent;
  }

  return aggregationPlan;
};

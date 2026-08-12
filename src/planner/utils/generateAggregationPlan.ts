import { v4 as uuidV4 } from "uuid";
import type { DraftPlan, Intent, PlanFlowControl } from "@/planner/types";
import { invariant } from "@/utils/invariant";

/**
 * Fold input plans into one note using the aggregation circuit's input limit.
 *
 * Intermediate rounds send their output back to the active account. The final
 * round receives `intent`, if provided, and delivers the requested amount to its
 * recipient.
 *
 * @example
 * const plan = generateAggregationPlan([dataNodeA, dataNodeB], 2, intent);
 * // -> a serial/parallel tree whose final command is "aggregator-aggregate"
 *
 * @throws when no inputs are supplied or the circuit cannot combine at least two inputs.
 */
export const generateAggregationPlan = (inputs: DraftPlan[], maxInputs: number, intent?: Intent): DraftPlan => {
  invariant(inputs.length > 0, "An aggregation plan requires at least one input.");
  invariant(maxInputs >= 2, "The aggregation circuit must accept at least two inputs.");

  const aggregate = (children: DraftPlan[]): PlanFlowControl => ({
    type: "serial",
    items: [
      children.length === 1 ? children[0] : { type: "parallel", items: children },
      { type: "command", id: uuidV4(), kind: "aggregator-aggregate" },
    ],
  });

  const fold = (level: DraftPlan[]): PlanFlowControl => {
    if (level.length <= maxInputs) return aggregate(level);

    const nextLevel: DraftPlan[] = [];
    for (let start = 0; start < level.length; start += maxInputs) {
      const group = level.slice(start, start + maxInputs);
      nextLevel.push(group.length === 1 ? group[0] : aggregate(group));
    }
    return fold(nextLevel);
  };

  const root = fold([...inputs]);
  const finalCommand = root.items.at(-1);
  invariant(
    finalCommand?.type === "command" && finalCommand.kind === "aggregator-aggregate",
    "An aggregation plan must end with an aggregation command.",
  );

  return {
    ...root,
    name: "Privacy Aggregation",
    description: "Aggregating funds",
    items: [...root.items.slice(0, -1), { ...finalCommand, intent }],
  };
};

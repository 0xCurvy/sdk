import type { DraftPlan, SendToAnyoneIntent, TransferIntent } from "@/planner/types";
import { generateAggregationPlan } from "./generateAggregationPlan";

/** Route a private transfer through aggregation to its recipient. */
export function generateTransferPlan(
  inputs: DraftPlan[],
  intent: TransferIntent | SendToAnyoneIntent,
  maxInputs: number,
): DraftPlan {
  return generateAggregationPlan(inputs, maxInputs, intent);
}

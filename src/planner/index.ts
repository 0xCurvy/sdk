/**
 * Pure planner utilities for integrations that need to preview or explain an
 * intent without invoking SDK state or network IO.
 */
export {
  type AggregateDelivery,
  type AggregationAllocationRecipient,
  type AggregationTotals,
  type ComputeAggregateDeliveryParameters,
  type ComputeAggregationTotalsParameters,
  computeAggregateDelivery,
  computeAggregationTotals,
} from "./feeMath";
export { describePlan } from "./utils/describePlan";

import type { DirectSubmitter, WithConfig } from "@/config/types";
import type { PlanSuccessfulExecution, PreparedIntent } from "@/planner/types";
import { executePreparedPlan } from "./executePlan";
import { getPreparedIntentState } from "./internal/preparedIntent";

export type ExecuteIntentParameters = WithConfig<{
  prepared: PreparedIntent;
  /** Override the config's direct signer adapter; the prepared submission mode cannot be changed. */
  directSubmitter?: DirectSubmitter;
}>;

/** Execute a handle returned by `estimateIntent`. */
export function executeIntent(parameters: ExecuteIntentParameters): Promise<PlanSuccessfulExecution> {
  const prepared = getPreparedIntentState(parameters.prepared);
  return executePreparedPlan({
    config: parameters.config,
    plan: prepared.plan,
    submissionMode: prepared.submissionMode,
    directSubmitter: parameters.directSubmitter,
  });
}

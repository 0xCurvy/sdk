import type { SubmissionMode } from "@/config/types";
import { PlanExecutionError } from "@/errors";
import type { EstimatedPlan, PreparedIntent } from "@/planner/types";
import { getPlanSteps } from "../getPlanSteps";

export type PreparedIntentState = { plan: EstimatedPlan; submissionMode: SubmissionMode };

const preparedPlans = new WeakMap<PreparedIntent, PreparedIntentState>();

export function prepareIntentPlan(plan: EstimatedPlan, submissionMode: SubmissionMode): PreparedIntent {
  const prepared: PreparedIntent = Object.freeze({
    id: crypto.randomUUID(),
    steps: Object.freeze(getPlanSteps(plan).map((step) => Object.freeze(step))),
  });
  preparedPlans.set(prepared, { plan, submissionMode });
  return prepared;
}

export function getPreparedIntentState(prepared: PreparedIntent): PreparedIntentState {
  const state = preparedPlans.get(prepared);
  if (!state) {
    throw new PlanExecutionError(
      "This prepared intent is no longer available. Estimate the intent again before executing it.",
    );
  }
  return state;
}

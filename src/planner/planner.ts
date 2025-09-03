//TODO: Convert to class with RPC, etc. when needed, for now it can stay pure

import { getCommandByName } from "@/planner/commands/registry";
import type {
  CurvyPlan,
  CurvyPlanEstimationResult,
  CurvyPlanExecutionResult,
  CurvyPlanSuccessfulExecution,
  CurvyPlanUnsuccessfulExecution,
} from "@/planner/plan";

function isResultSuccessful(result: CurvyPlanExecutionResult | CurvyPlanEstimationResult): boolean {
  if (Array.isArray(result)) {
    return result.every((r) => r.success);
  }

  return result.success;
}

export async function executePlan(plan: CurvyPlan): Promise<CurvyPlanExecutionResult> {
  // CurvyPlanFlowControl, parallel
  if (plan.type === "parallel") {
    return Promise.all(
      plan.items.map((item) =>
        executePlan(item)
          .then((output) => ({ success: true, output }) as CurvyPlanSuccessfulExecution)
          .catch((error) => ({ success: false, error }) as CurvyPlanUnsuccessfulExecution),
      ),
    );
  }

  // CurvyPlanFlowControl, serial
  if (plan.type === "serial") {
    let lastResult: CurvyPlanExecutionResult;

    for (const item of plan.items) {
      lastResult = await executePlan(item);

      if (!isResultSuccessful(lastResult)) {
        // TODO: How does the top-most executePlan have all the executions?
        break;
      }
    }
  }

  // CurvyPlanCommand
  if (plan.type === "command") {
    const command = getCommandByName(plan.name);
    const instance = new command();
    return getComman;
  }

  // CurvyPlanAddress
  if (plan.type === "address") {
  }
}

export function estimatePlan(plan: CurvyPlan): Promise<CurvyPlanEstimationResult> {}

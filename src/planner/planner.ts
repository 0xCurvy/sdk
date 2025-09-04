import type {
  CurvyPlan,
  CurvyPlanEstimation,
  CurvyPlanExecution,
  CurvyPlanSuccessfulExecution,
  CurvyPlanUnsuccessfulExecution
} from "@/planner/plan";

import { commandFactory } from "@/planner/commands/factory";
import { CurvyCommandInput } from "@/planner/addresses/abstract";

export async function executePlan(plan: CurvyPlan, input?: CurvyCommandInput): Promise<CurvyPlanExecution> {
  // CurvyPlanFlowControl, parallel
  if (plan.type === "parallel") {
    const result = await Promise.all(plan.items.map((item) => executePlan(item)));
    const success = result.every((r) => r.success);

    return <CurvyPlanExecution> {
      success,
      items: result,
    }
  }

  // CurvyPlanFlowControl, serial
  if (plan.type === "serial") {
    const results: CurvyPlanExecution[] = [];

    if (plan.items.length === 0) {
      throw new Error("No items in serial node!");
    }

    for (const item of plan.items) {
        const result = await executePlan(item);

        results.push(result);

        // If latest item is unsuccessful, fail entire serial flow node with that error.
        if (!result.success) {
          return <CurvyPlanUnsuccessfulExecution>{
            success: false,
            error: result.error,
            items: results
          };
        }
    }

    // The output address of the successful serial flow is the last members address.
    return <CurvyPlanSuccessfulExecution>{
      success: true,
      address: (results[results.length - 1] as CurvyPlanSuccessfulExecution).address,
      items: results
    };
  }

  // CurvyPlanCommand
  if (plan.type === "command") {
    if (!input) {
      throw new Error("Input is required for command node!");
    }

    try {
      const command = commandFactory(plan.name, input, plan.intent);
      const address = await command.execute();

      return <CurvyPlanSuccessfulExecution> {
        success: true,
        address
      }
    } catch (error) {
      return <CurvyPlanUnsuccessfulExecution> {
        success: false,
        error
      };
    }
  }

  // CurvyPlanInput
  if (plan.type === "input") {
    return <CurvyPlanSuccessfulExecution> {
      success: true,
      input: plan.input
    };
  }

  throw new Error(`Unrecognized type for plan node: ${plan.type}`);
}

// @ts-ignore
export function estimatePlan(_plan: CurvyPlan): Promise<CurvyPlanEstimation> {
  // TODO: Implement
}

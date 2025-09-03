import type {
  CurvyPlan,
  CurvyPlanEstimation,
  CurvyPlanExecution,
  CurvyPlanSuccessfulExecution,
  CurvyPlanUnsuccessfulExecution
} from "@/planner/plan";

import { commandFactory } from "@/planner/commands/factory";

export async function executePlan(plan: CurvyPlan): Promise<CurvyPlanExecution> {
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
      try {
        results.push(await executePlan(item));
      } catch (error) {
        results.push({
          success: false,
          error
        });

        return <CurvyPlanUnsuccessfulExecution>{
          success: false,
          error: error,
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
    try {
      const command = commandFactory(plan.name, plan.input, plan.intent);
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

  // CurvyPlanAddress
  if (plan.type === "address") {
    return <CurvyPlanSuccessfulExecution> {
      success: true,
      address: plan.address
    };
  }

  throw new Error(`Unrecognized type for plan node: ${plan.type}`);
}

// @ts-ignore
export function estimatePlan(plan: CurvyPlan): Promise<CurvyPlanEstimation> {
  // TODO: Implement
}

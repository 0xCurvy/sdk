import { commandFactory } from "@/planner/commands/factory";
import type {
  CurvyCommandData,
  CurvyPlan,
  CurvyPlanEstimation,
  CurvyPlanExecution,
  CurvyPlanSuccessfulExecution,
  CurvyPlanUnsuccessfulExecution,
} from "@/planner/plan";

// TODO: Ovde zelimo negde da uradimo injection commandFacotry typa radi boljih testova
export async function executePlan(plan: CurvyPlan, input?: CurvyCommandData): Promise<CurvyPlanExecution> {
  // CurvyPlanFlowControl, parallel
  if (plan.type === "parallel") {
    // Parallel plans don't take any input,
    // because that would mean that each of its children is getting the same Address as input
    const result = await Promise.all(plan.items.map((item) => executePlan(item)));
    const success = result.every((r) => r.success);

    return <CurvyPlanExecution>{
      success,
      items: result,
    };
  }

  // CurvyPlanFlowControl, serial
  if (plan.type === "serial") {
    const results: CurvyPlanExecution[] = [];

    if (plan.items.length === 0) {
      throw new Error("No items in serial node!");
    }

    let data = input;
    for (const item of plan.items) {
      const result = await executePlan(item, data);

      results.push(result);

      // If latest item is unsuccessful, fail entire serial flow node with that error.
      if (!result.success) {
        return <CurvyPlanUnsuccessfulExecution>{
          success: false,
          error: result.error,
          items: results,
        };
      }

      // Set the output of current as data of next step
      data = result.data;
    }

    // The output address of the successful serial flow is the last members address.
    return <CurvyPlanSuccessfulExecution>{
      success: true,
      data: (results[results.length - 1] as CurvyPlanSuccessfulExecution).data,
      items: results, // TODO: I don't think this is needed
    };
  }

  // CurvyPlanCommand
  if (plan.type === "command") {
    if (!input) {
      throw new Error("Input is required for command node!");
    }

    try {
      const command = commandFactory(plan.name, input, plan.intent);
      const data = await command.execute();

      return <CurvyPlanSuccessfulExecution>{
        success: true,
        data,
      };
    } catch (error) {
      return <CurvyPlanUnsuccessfulExecution>{
        success: false,
        error,
      };
    }
  }

  // CurvyPlanData
  if (plan.type === "data") {
    return <CurvyPlanSuccessfulExecution>{
      success: true,
      data: plan.data,
    };
  }

  throw new Error(`Unrecognized type for plan node: ${plan.type}`);
}

// @ts-expect-error
export function estimatePlan(_plan: CurvyPlan): Promise<CurvyPlanEstimation> {
  // TODO: Implement
}

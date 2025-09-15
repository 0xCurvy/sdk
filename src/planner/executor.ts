import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { ICommandFactory } from "@/planner/commands/factory";
import type {
  CurvyCommandData,
  CurvyPlan,
  CurvyPlanEstimation,
  CurvyPlanExecution,
  CurvyPlanSuccessfulExecution,
  CurvyPlanUnsuccessfulExecution,
} from "@/planner/plan";
import type { BalanceEntry } from "@/types";

export class CommandExecutor {
  private commandFactory: ICommandFactory;
  private eventEmitter: ICurvyEventEmitter;

  constructor(commandFactory: ICommandFactory, eventEmitter: ICurvyEventEmitter) {
    this.commandFactory = commandFactory;
    this.eventEmitter = eventEmitter;
  }

  async executePlan(plan: CurvyPlan): Promise<CurvyPlanExecution> {
    this.eventEmitter.emitPlanExecutionStarted({ plan });
    const result = await this.executeRecursively(plan);

    if (result.success) {
      this.eventEmitter.emitPlanExecutionComplete({ plan, result });
    } else {
      this.eventEmitter.emitPlanExecutionError({ plan, result });
    }

    return result;
  }

  private async executeRecursively(plan: CurvyPlan, input?: CurvyCommandData): Promise<CurvyPlanExecution> {
    // CurvyPlanFlowControl, parallel
    if (plan.type === "parallel") {
      // Parallel plans don't take any input,
      // because that would mean that each of its children is getting the same Address as input
      const result = await Promise.all(plan.items.map((item) => this.executeRecursively(item)));
      const success = result.every((r) => r.success);

      this.eventEmitter.emitPlanExecutionProgress({ plan, result: { success, items: result } as CurvyPlanExecution });

      if (success) {
        return {
          success: true,
          items: result,
          data: result.filter((r) => r.success && r.data !== undefined).map((r) => r.data) as BalanceEntry[],
        };
      }

      return {
        success: false,
        items: result,
        error: result.filter((r) => !r.success).map((r) => r.error),
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
        const result = await this.executeRecursively(item, data);

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
        data,
        items: results, // TODO: I don't think this is needed
      };
    }

    // CurvyPlanCommand
    if (plan.type === "command") {
      if (!input) {
        throw new Error("Input is required for command node!");
      }

      try {
        const command = this.commandFactory.createCommand(plan.name, input, plan.intent);
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
  // noinspection JSUnusedGlobalSymbols
  async estimatePlan(_plan: CurvyPlan): Promise<CurvyPlanEstimation> {
    // TODO: Implement
  }
}

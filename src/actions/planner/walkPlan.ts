import type {
  CommandData,
  CommandEstimate,
  DraftCommand,
  EstimatedPlan,
  Plan,
  PlanData,
  PlanExecution,
  PlanWait,
} from "@/planner/types";
import { accumulateEstimate, mergeEstimates } from "@/planner/utils";
import type { BalanceEntry } from "@/types";
import { invariant } from "@/utils/invariant";

export type PlanWalkSuccessResult = {
  success: true;
  data?: CommandData;
  estimate?: CommandEstimate;
  estimatedPlan?: EstimatedPlan;
  items?: PlanWalkResult[];
};

export type PlanWalkFailureResult = {
  success: false;
  error: unknown;
  items?: PlanWalkResult[];
};

export type PlanWalkResult = PlanWalkSuccessResult | PlanWalkFailureResult;

function requireEstimatedPlans(results: PlanWalkSuccessResult[]): EstimatedPlan[] {
  return results.map((result) => {
    invariant(result.estimatedPlan, "Expected every successful child result to include an estimated plan.");
    return result.estimatedPlan;
  });
}

export type PlanNodeHandlers<C extends DraftCommand> = {
  command: (plan: C, input: CommandData) => Promise<PlanWalkResult>;
  data: (plan: PlanData, input?: CommandData) => Promise<PlanWalkResult>;
  wait: (plan: PlanWait, input?: CommandData) => Promise<PlanWalkResult>;
};

/**
 * Generic plan tree walker (functional port of `Planner.#walkPlan`). Handles
 * parallel/serial flow control uniformly, delegating leaf nodes (command, data,
 * wait) to the provided handlers.
 *
 * For `parallel` nodes it reports aggregate progress via `emitProgress` (the
 * class called `eventEmitter.emitPlanExecutionProgress` here).
 *
 * @example
 * const result = await walkPlan(plan, handlers, undefined, (plan, result) =>
 *   config.emitter.emitPlanExecutionProgress({ plan, result }),
 * );
 */
export async function walkPlan<C extends DraftCommand>(
  plan: Plan<C>,
  handlers: PlanNodeHandlers<C>,
  input?: CommandData,
  emitProgress?: (plan: Plan<C>, result: PlanExecution) => void,
): Promise<PlanWalkResult> {
  // Parallel flow control
  if (plan.type === "parallel") {
    const results = await Promise.all(plan.items.map((item) => walkPlan(item, handlers, undefined, emitProgress)));
    const success = results.every((r) => r.success);

    emitProgress?.(plan, { success, items: results } as PlanExecution);

    if (success) {
      const hasEstimatedPlans = results[0]?.estimatedPlan !== undefined;

      return {
        success: true,
        ...(hasEstimatedPlans && {
          estimatedPlan: {
            type: "parallel" as const,
            name: plan.name,
            description: plan.description,
            items: requireEstimatedPlans(results),
          },
        }),
        items: results,
        estimate: mergeEstimates(results),
        data: results.filter((r) => r.data !== undefined).map((r) => r.data) as BalanceEntry[],
      };
    }

    return {
      success: false,
      items: results,
      error: results.filter((r) => !r.success).map((r) => (r as PlanWalkFailureResult).error),
    };
  }

  // Serial flow control
  if (plan.type === "serial") {
    const results: PlanWalkSuccessResult[] = [];

    invariant(plan.items.length > 0, "No items in serial node!");

    let data = input;
    const estimate: CommandEstimate = { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n };

    for (const item of plan.items) {
      const result = await walkPlan(item, handlers, data, emitProgress);
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          items: results,
        };
      }

      results.push(result);

      accumulateEstimate(estimate, result.estimate);
      data = result.data;
    }

    const hasEstimatedPlans = results[0]?.estimatedPlan !== undefined;

    return {
      success: true,
      ...(hasEstimatedPlans && {
        estimatedPlan: {
          type: "serial" as const,
          name: plan.name,
          description: plan.description,
          items: requireEstimatedPlans(results),
        },
      }),
      data,
      estimate,
      items: results,
    };
  }

  // Leaf nodes — delegate to handlers
  if (plan.type === "command") {
    invariant(input, "Input is required for command node!");
    return handlers.command(plan, input);
  }

  if (plan.type === "data") {
    return handlers.data(plan, input);
  }

  if (plan.type === "wait") {
    return handlers.wait(plan, input);
  }

  throw new Error(`Unrecognized type for plan node: ${(plan as Plan).type}`);
}

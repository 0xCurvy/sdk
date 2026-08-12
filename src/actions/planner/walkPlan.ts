import { type CurvyError, PlanExecutionError } from "@/errors";
import type {
  CommandData,
  CommandEstimate,
  DraftCommand,
  IntentOutput,
  Plan,
  PlanData,
  PlanFlowControl,
  PlanResult,
  PlanValue,
  PlanWait,
} from "@/planner/types";
import { accumulateEstimate, mergeEstimates } from "@/planner/utils";
import type { BalanceEntry } from "@/types";
import { invariant } from "@/utils/invariant";

export type PlanWalkResult<TPreparedPlan = never> = PlanResult<TPreparedPlan>;
export type PlanWalkSuccessResult<TPreparedPlan = never> = Extract<PlanWalkResult<TPreparedPlan>, { success: true }>;
export type PlanWalkFailureResult<TPreparedPlan = never> = Extract<PlanWalkResult<TPreparedPlan>, { success: false }>;

export type PlanNodeHandlers<C extends DraftCommand, TPreparedPlan = never> = {
  command: (plan: C, input: CommandData) => Promise<PlanWalkResult<TPreparedPlan>>;
  data: (plan: PlanData, input?: PlanValue) => Promise<PlanWalkResult<TPreparedPlan>>;
  wait: (plan: PlanWait, input?: PlanValue) => Promise<PlanWalkResult<TPreparedPlan>>;
};

export type WalkPlanParameters<C extends DraftCommand, TPreparedPlan> = {
  plan: Plan<C>;
  handlers: PlanNodeHandlers<C, TPreparedPlan>;
  input?: PlanValue;
  /** Build the prepared representation of a serial or parallel node. */
  mapFlow?: (flow: PlanFlowControl<C>, children: TPreparedPlan[]) => TPreparedPlan;
  combineFailures?: (causes: CurvyError[]) => CurvyError;
  onProgress?: (node: Plan<C>, result: PlanWalkResult<TPreparedPlan>) => void;
};

const preparedChildren = <TPreparedPlan>(results: PlanWalkSuccessResult<TPreparedPlan>[]): TPreparedPlan[] =>
  results.map((result) => {
    invariant(result.preparedPlan !== undefined, "Every successful child must include its prepared plan.");
    return result.preparedPlan;
  });

/** Traverse a plan, forwarding serial output and aggregating parallel results. */
export async function walkPlan<C extends DraftCommand, TPreparedPlan = never>(
  parameters: WalkPlanParameters<C, TPreparedPlan>,
): Promise<PlanWalkResult<TPreparedPlan>> {
  const { plan, handlers, input, mapFlow, combineFailures, onProgress } = parameters;

  if (plan.type === "parallel") {
    const results = await Promise.all(
      plan.items.map((item) => walkPlan({ plan: item, handlers, mapFlow, combineFailures, onProgress })),
    );
    const successful = results.filter((result): result is PlanWalkSuccessResult<TPreparedPlan> => result.success);
    if (successful.length !== results.length) {
      const causes = results.filter((result) => !result.success).map((result) => result.error);
      const failure: PlanWalkFailureResult<TPreparedPlan> = {
        success: false,
        items: results,
        error:
          combineFailures?.(causes) ??
          new PlanExecutionError("One or more parallel plan branches failed.", undefined, undefined, undefined, causes),
      };
      onProgress?.(plan, failure);
      return failure;
    }

    const result: PlanWalkSuccessResult<TPreparedPlan> = {
      success: true,
      items: results,
      estimate: mergeEstimates(results),
      data: successful.flatMap((child) => {
        if (child.data === undefined) return [];
        invariant(Array.isArray(child.data), "Parallel plan branches must produce private note data.");
        return child.data;
      }) as BalanceEntry[],
      output: successful.find((child) => child.output !== undefined)?.output,
      ...(mapFlow && { preparedPlan: mapFlow(plan, preparedChildren(successful)) }),
    };
    onProgress?.(plan, result);
    return result;
  }

  if (plan.type === "serial") {
    invariant(plan.items.length > 0, "No items in serial node!");
    const results: PlanWalkResult<TPreparedPlan>[] = [];
    let data = input;
    let output: IntentOutput | undefined;
    const estimate: CommandEstimate = { gasFeeInCurrency: 0n, curvyFeeInCurrency: 0n };

    for (const item of plan.items) {
      const result = await walkPlan({ plan: item, handlers, input: data, mapFlow, combineFailures, onProgress });
      results.push(result);
      if (!result.success) {
        const failure: PlanWalkFailureResult<TPreparedPlan> = { success: false, error: result.error, items: results };
        onProgress?.(plan, failure);
        return failure;
      }
      accumulateEstimate(estimate, result.estimate);
      data = result.data;
      output = result.output ?? output;
    }

    const successful = results as PlanWalkSuccessResult<TPreparedPlan>[];
    const result: PlanWalkSuccessResult<TPreparedPlan> = {
      success: true,
      data,
      output,
      estimate,
      items: results,
      ...(mapFlow && { preparedPlan: mapFlow(plan, preparedChildren(successful)) }),
    };
    onProgress?.(plan, result);
    return result;
  }

  if (plan.type === "command") {
    invariant(Array.isArray(input) && input.length > 0, "A command node requires private note input.");
    const result = await handlers.command(plan, input);
    onProgress?.(plan, result);
    return result;
  }
  if (plan.type === "data") {
    const result = await handlers.data(plan, input);
    onProgress?.(plan, result);
    return result;
  }
  if (plan.type === "wait") {
    const result = await handlers.wait(plan, input);
    onProgress?.(plan, result);
    return result;
  }

  throw new PlanExecutionError(`Unsupported plan node type: ${(plan as Plan<C>).type}.`);
}

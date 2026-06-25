import type { CurvyConfig } from "@/config/types";
import type { EstimatedPlan, PlanExecution } from "@/planner/types";
import { pollForCriteria } from "@/utils";
import { createCommand } from "./commands";
import { walkPlan } from "./walkPlan";

/**
 * Execute an already-estimated plan tree (functional port of
 * `Planner.#executeRecursively`). Walks the tree, re-hydrating each command from
 * its stored estimate and running it; spent balance entries are removed from
 * storage and per-command progress is emitted. `wait` nodes poll their
 * condition until it holds (or time out).
 *
 * @example
 * const result = await executePlanTree(config, estimatedPlan);
 */
export async function executePlanTree(
  config: CurvyConfig,
  plan: EstimatedPlan,
  input?: Parameters<typeof walkPlan>[2],
): Promise<PlanExecution> {
  return walkPlan(
    plan,
    {
      command: async (node, nodeInput) => {
        try {
          const command = createCommand(config, {
            id: node.id,
            name: node.name,
            input: nodeInput,
            intent: node.intent,
            estimate: node.estimate,
          });

          const data = await command.execute();

          await config.storage.removeSpentBalanceEntries(Array.isArray(nodeInput) ? nodeInput : [nodeInput]);
          config.emitter.emitPlanCommandExecutionProgress({ commandId: node.id });

          return { success: true, estimate: node.estimate, data };
        } catch (error) {
          return { success: false, error };
        }
      },
      data: async (node) => {
        return { success: true, data: node.data };
      },
      wait: async (node, nodeInput) => {
        try {
          await pollForCriteria(() => node.condition(), Boolean, 30, 10000);

          config.emitter.emitPlanCommandExecutionProgress({ commandId: node.id });

          return { success: true, data: nodeInput };
        } catch {
          return {
            success: false,
            error: new Error(`Timeout: ${node.name} condition was not met within the expected time.`),
          };
        }
      },
    },
    input,
    (p, result: PlanExecution) => config.emitter.emitPlanExecutionProgress({ plan: p, result }),
  ) as Promise<PlanExecution>;
}

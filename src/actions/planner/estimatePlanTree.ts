import type { CurvyConfig } from "@/config/types";
import type { DraftPlan, EstimatedCommand, PlanEstimation, PlanExecution } from "@/planner/types";
import { createCommand } from "./commands";
import { walkPlan } from "./walkPlan";

/**
 * Estimate every command in a draft plan tree (functional port of
 * `Planner.#estimateRecursively`). Walks the tree, building an `EstimatedPlan`
 * by resolving each command via {@link createCommand}, estimating its fees, and
 * threading the resulting balance entry to the next serial node.
 *
 * @example
 * const estimation = await estimatePlanTree(config, draftPlan);
 */
export async function estimatePlanTree(
  config: CurvyConfig,
  plan: DraftPlan,
  input?: Parameters<typeof walkPlan>[2],
): Promise<PlanEstimation> {
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
          });

          const estimate = await command.estimateFees();
          const data = await command.getResultingBalanceEntry();

          const estimatedCommand: EstimatedCommand = { ...node, estimate };

          return { success: true, estimatedPlan: estimatedCommand, estimate, data };
        } catch (error) {
          return { success: false, error };
        }
      },
      data: async (node) => {
        return { success: true, estimatedPlan: node, data: node.data };
      },
      wait: async (node, nodeInput) => {
        return { success: true, estimatedPlan: node, data: nodeInput };
      },
    },
    input,
    (p, result: PlanExecution) => config.emitter.emitPlanExecutionProgress({ plan: p, result }),
  ) as Promise<PlanEstimation>;
}

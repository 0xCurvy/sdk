import type { CurvyConfig, SubmissionMode } from "@/config/types";
import { normalizeCurvyError, PlanEstimationError } from "@/errors";
import type { DraftCommand, DraftPlan, EstimatedCommand, EstimatedPlan, PlanEstimation } from "@/planner/types";
import { createCommand } from "./commands";
import { walkPlan } from "./walkPlan";

/** Internal tree estimator used by `estimateIntent`. */
export type EstimatePlanTreeParameters = {
  config: CurvyConfig;
  plan: DraftPlan;
  input?: Parameters<typeof walkPlan>[0]["input"];
  submissionMode?: SubmissionMode;
};

export async function estimatePlanTree(parameters: EstimatePlanTreeParameters): Promise<PlanEstimation> {
  const { config, plan, input, submissionMode = config.submissionMode } = parameters;
  return walkPlan<DraftCommand, EstimatedPlan>({
    plan,
    handlers: {
      command: async (node, nodeInput) => {
        try {
          const command = createCommand(config, {
            id: node.id,
            kind: node.kind,
            input: nodeInput,
            intent: node.intent,
            submissionMode,
          });

          const estimate = await command.estimateFees();
          const data = await command.getResultingData();
          const execution = command.getExecutionData();
          const output = command.getIntentOutput();

          const estimatedCommand: EstimatedCommand = { ...node, estimate, execution };

          return { success: true, preparedPlan: estimatedCommand, estimate, data, output };
        } catch (error) {
          const cause = normalizeCurvyError(error);
          return {
            success: false,
            error: new PlanEstimationError(`Could not estimate ${node.kind}.`, node.id, node.kind, cause, [cause]),
          };
        }
      },
      data: async (node) => {
        return { success: true, preparedPlan: node, data: node.data };
      },
      wait: async (node, nodeInput) => {
        return { success: true, preparedPlan: node, data: nodeInput };
      },
    },
    input,
    mapFlow: (flow, items) => ({ ...flow, items }),
    combineFailures: (causes) =>
      new PlanEstimationError(
        "One or more parallel plan branches could not be estimated.",
        undefined,
        undefined,
        undefined,
        causes,
      ),
  });
}

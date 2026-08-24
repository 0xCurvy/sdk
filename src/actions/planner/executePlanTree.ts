import type { CurvyConfig, DirectSubmitter, SubmissionMode } from "@/config/types";
import { type CurvyError, normalizeCurvyError, PlanExecutionError, PlanWaitTimeoutError } from "@/errors";
import type { EstimatedPlan, PlanExecution, PlanWait } from "@/planner/types";
import { hasBytecode } from "@/rpc/hasBytecode";
import { pollForCriteria } from "@/utils";
import { sleepWithTimerProvider } from "@/utils/timer";
import { createCommand } from "./commands";
import { walkPlan } from "./walkPlan";

/** Internal estimated-plan executor. Public integrations call `executeIntent`. */
export type ExecutePlanTreeParameters = {
  config: CurvyConfig;
  plan: EstimatedPlan;
  submissionMode?: SubmissionMode;
  directSubmitter?: DirectSubmitter;
  input?: Parameters<typeof walkPlan>[0]["input"];
  onStep?: (event: { id: string; status: "started" | "succeeded" | "failed"; error?: CurvyError }) => void;
  resolveWait?: (condition: PlanWait["condition"]) => Promise<boolean>;
};

export async function executePlanTree(parameters: ExecutePlanTreeParameters): Promise<PlanExecution> {
  const { config, plan, input, onStep, submissionMode = config.submissionMode, directSubmitter } = parameters;
  const resolveWait =
    parameters.resolveWait ??
    (async (condition: PlanWait["condition"]): Promise<boolean> => {
      const network = config.state.networks.find((candidate) => candidate.slug === condition.networkSlug);
      if (!network) return false;
      const deployed = await hasBytecode({ config, network, address: condition.address });
      if (deployed && condition.settleDelayMs) {
        await sleepWithTimerProvider(config._internal.timerProvider, condition.settleDelayMs);
      }
      return deployed;
    });
  return walkPlan({
    plan,
    handlers: {
      command: async (node, nodeInput) => {
        onStep?.({ id: node.id, status: "started" });
        try {
          const command = createCommand(config, {
            id: node.id,
            kind: node.kind,
            input: nodeInput,
            intent: node.intent,
            estimate: node.estimate,
            execution: node.execution,
            submissionMode,
            directSubmitter,
          });

          const data = await command.execute();
          onStep?.({ id: node.id, status: "succeeded" });

          return { success: true, estimate: node.estimate, data };
        } catch (error) {
          const cause = normalizeCurvyError(error);
          const executionError = new PlanExecutionError(`Could not execute ${node.kind}.`, node.id, node.kind, cause, [
            cause,
          ]);
          onStep?.({ id: node.id, status: "failed", error: executionError });
          return {
            success: false,
            error: executionError,
          };
        }
      },
      data: async (node) => {
        return { success: true, data: node.data };
      },
      wait: async (node, nodeInput) => {
        onStep?.({ id: node.id, status: "started" });
        try {
          await pollForCriteria(
            () => resolveWait(node.condition),
            Boolean,
            config.executionPolicy.planWaitAttempts,
            config.executionPolicy.planWaitIntervalMs,
            undefined,
            (ms) => sleepWithTimerProvider(config._internal.timerProvider, ms),
          );
          onStep?.({ id: node.id, status: "succeeded" });

          return { success: true, data: nodeInput };
        } catch (error) {
          const waitError =
            error instanceof PlanWaitTimeoutError ? error : new PlanWaitTimeoutError(node.id, node.name);
          onStep?.({ id: node.id, status: "failed", error: waitError });
          return {
            success: false,
            error: waitError,
          };
        }
      },
    },
    input,
  });
}

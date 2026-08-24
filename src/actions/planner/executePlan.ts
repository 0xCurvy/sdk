import { getActiveAccount } from "@/actions/account/getActiveAccount";
import { pauseBalanceRefresh } from "@/actions/balances/pauseBalanceRefresh";
import { resumeBalanceRefresh } from "@/actions/balances/resumeBalanceRefresh";
import { resolveConfig } from "@/config/global";
import type { DirectSubmitter, SubmissionMode, WithConfig } from "@/config/types";
import { NoActiveAccountError, normalizeCurvyError } from "@/errors";
import type { EstimatedPlan, PlanSuccessfulExecution } from "@/planner/types";
import { executePlanTree } from "./executePlanTree";
import { getPlanSteps } from "./getPlanSteps";

type ExecutePreparedPlanParameters = WithConfig<{
  plan: EstimatedPlan;
  submissionMode?: SubmissionMode;
  directSubmitter?: DirectSubmitter;
}>;

/** Internal executor behind the opaque prepared-intent API. */
export async function executePreparedPlan(parameters: ExecutePreparedPlanParameters): Promise<PlanSuccessfulExecution> {
  const config = resolveConfig(parameters.config);
  const { plan } = parameters;

  const activeAccount = getActiveAccount({ config });
  if (!activeAccount) throw new NoActiveAccountError();
  const activeAccountId = activeAccount.id;
  const executionId = crypto.randomUUID();
  const steps = getPlanSteps(plan);
  const stepsById = new Map(steps.map((step) => [step.id, step]));
  config.emitter.emitPlanExecutionStarted({ executionId, steps });

  // Restore the caller's pause state after execution; an outer operation may
  // already own the refresh lock.
  const lockKey = `refresh-account-${activeAccountId}`;
  const wasAlreadyPaused = config._internal.scanLocks.get(lockKey) === true;

  pauseBalanceRefresh({ accountId: activeAccountId, config });

  try {
    const result = await executePlanTree({
      config,
      plan,
      submissionMode: parameters.submissionMode ?? config.submissionMode,
      directSubmitter: parameters.directSubmitter ?? config.directSubmitter,
      onStep: ({ id, status, error }) => {
        const step = stepsById.get(id);
        if (!step) return;
        const progress = { executionId, step, status, error };
        config.emitter.emitPlanExecutionProgress(progress);
      },
    });
    if (!result.success) throw result.error;
    config.emitter.emitPlanExecutionComplete({ executionId, steps });
    return result;
  } catch (error) {
    const normalized = normalizeCurvyError(error, "Plan execution failed.");
    config.emitter.emitPlanExecutionError({ executionId, steps, error: normalized });
    throw normalized;
  } finally {
    if (!wasAlreadyPaused) {
      resumeBalanceRefresh({ accountId: activeAccountId, config });
    }
  }
}

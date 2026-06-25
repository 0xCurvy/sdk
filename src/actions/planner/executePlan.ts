import { getActiveAccount } from "@/actions/account/getActiveAccount";
import { pauseBalanceRefresh } from "@/actions/balances/pauseBalanceRefresh";
import { resumeBalanceRefresh } from "@/actions/balances/resumeBalanceRefresh";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NoActiveAccountError } from "@/errors";
import type { EstimatedPlan, PlanExecution } from "@/planner/types";
import { executePlanTree } from "./executePlanTree";

export type ExecutePlanParameters = WithConfig<{ plan: EstimatedPlan }>;

/**
 * Execute an already-estimated plan (functional port of `Planner.execute`).
 * Pauses the active account's balance refresh for the duration of execution,
 * walks the plan tree, then resumes refresh and emits the appropriate
 * completion/error event.
 *
 * @example
 * const result = await executePlan({ plan });
 *
 * @throws {NoActiveAccountError} when no account is active.
 * @throws the underlying error when execution fails.
 */
export async function executePlan(parameters: ExecutePlanParameters): Promise<PlanExecution> {
  const config = resolveConfig(parameters.config);
  const { plan } = parameters;

  config.emitter.emitPlanExecutionStarted({ plan });

  const activeAccount = getActiveAccount({ config });
  if (!activeAccount) throw new NoActiveAccountError();
  const activeAccountId = activeAccount.id;

  pauseBalanceRefresh({ accountId: activeAccountId, config });

  // try/finally: a structural throw from walkPlan (the `invariant` sites fire
  // ABOVE the per-node handler try/catch) must still resume refresh, else the
  // account's scanLock stays paused for the rest of the session.
  let result: PlanExecution;
  try {
    result = await executePlanTree(config, plan, undefined);
  } finally {
    resumeBalanceRefresh({ accountId: activeAccountId, config });
  }

  if (result.success) {
    config.emitter.emitPlanExecutionComplete({ plan, result });
  } else {
    config.emitter.emitPlanExecutionError({ plan, result });
  }

  if (!result.success) {
    throw result.error;
  }

  return result;
}

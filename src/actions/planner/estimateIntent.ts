import { getActiveAccount } from "@/actions/account/getActiveAccount";
import { resolveConfig } from "@/config/global";
import { getProtocol } from "@/config/protocol";
import type { SubmissionMode, WithConfig } from "@/config/types";
import { NoActiveAccountError } from "@/errors";
import type { Intent, IntentEstimation } from "@/planner/types";
import { generatePlan } from "@/planner/utils";
import type { InputFinalityPolicy } from "@/storage/types";
import { toSlug } from "@/utils/format";
import { invariant } from "@/utils/invariant";
import { estimatePlanTree } from "./estimatePlanTree";
import { prepareIntentPlan } from "./internal/preparedIntent";
import { resolveInputFinalityPolicy } from "./resolveInputFinalityPolicy";

export type EstimateIntentParameters = WithConfig<{
  intent: Intent;
  /** Integration-level lower bound that account/intent settings cannot weaken. */
  minimumInputFinalityPolicy?: InputFinalityPolicy;
  /** Override the config's submission path for this estimate and its prepared execution. */
  submissionMode?: SubmissionMode;
}>;

/**
 * Select spendable notes and return fees, delivered amount, a sanitized route,
 * and an in-memory handle that can be passed to `executeIntent`.
 *
 * @example
 * const estimation = await estimateIntent({ intent });
 *
 * @throws {NoActiveAccountError} when no account is active.
 * @throws a typed `CurvyError` when selection or estimation fails.
 */
export async function estimateIntent(parameters: EstimateIntentParameters): Promise<IntentEstimation> {
  const config = resolveConfig(parameters.config);
  const { intent } = parameters;
  const submissionMode = parameters.submissionMode ?? config.submissionMode;

  const activeAccount = getActiveAccount({ config });
  if (!activeAccount) throw new NoActiveAccountError();
  const activeAccountId = activeAccount.id;

  const networkSlug = toSlug(intent.network.name);
  const inputFinalityPolicy = await resolveInputFinalityPolicy({
    config,
    accountId: activeAccountId,
    networkSlug,
    intent,
    mandatory: parameters.minimumInputFinalityPolicy,
  });
  const balances = (
    await config.storage.getProjectedBalances(activeAccountId, networkSlug, inputFinalityPolicy)
  ).filter((entry) => entry.currencyAddress === intent.currency.contractAddress);

  const resolvedIntent = { ...intent, inputFinalityPolicy } as Intent;
  const { plan: draftPlan, usedBalances } = generatePlan(balances, resolvedIntent, {
    maxInputs: getProtocol({ config }).proving.aggregation.maxInputs,
    shieldSettleDelayMs: config.executionPolicy.shieldSettleDelayMs,
  });

  const result = await estimatePlanTree({ config, plan: draftPlan, submissionMode });
  if (!result.success) {
    throw result.error;
  }

  invariant(result.data, "Estimation produced no delivered value.");

  invariant(result.estimate, "Estimation resulted in no estimate data.");
  invariant(result.preparedPlan, "Estimation resulted in no prepared plan.");
  let effectiveAmount: bigint;
  if (Array.isArray(result.data)) {
    invariant(result.data.length === 1, "Estimation produced multiple final private notes.");
    effectiveAmount = result.data[0].balance;
  } else {
    effectiveAmount = result.data.amount;
  }

  return {
    prepared: prepareIntentPlan(result.preparedPlan, submissionMode),
    plan: result.preparedPlan,
    usedBalances,
    gas: result.estimate.gasFeeInCurrency,
    curvyFee: result.estimate.curvyFeeInCurrency,
    bridgeFee: result.estimate.bridgeFeeInCurrency,
    effectiveAmount,
    degradedToFeesOnAmount: result.estimate.degradedToFeesOnAmount ?? false,
    inputFinalityPolicy,
    output: result.output,
  };
}

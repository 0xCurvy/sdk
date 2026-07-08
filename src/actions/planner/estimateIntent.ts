import { getActiveAccount } from "@/actions/account/getActiveAccount";
import { resolveConfig } from "@/config/global";
import { getProtocol } from "@/config/protocol";
import type { WithConfig } from "@/config/types";
import { NoActiveAccountError } from "@/errors";
import type { Intent, IntentEstimation } from "@/planner/types";
import { generatePlan } from "@/planner/utils";
import { hasBytecode } from "@/rpc/hasBytecode";
import { toSlug } from "@/utils/format";
import { invariant } from "@/utils/invariant";
import { estimatePlanTree } from "./estimatePlanTree";

export type EstimateIntentParameters = WithConfig<{ intent: Intent }>;

/**
 * Estimate the full cost of fulfilling an `intent` (functional port of
 * `Planner.estimate`). Selects the active account's matching balances, generates
 * a draft plan, estimates the whole tree, and returns the consumed balances plus
 * the aggregated fee breakdown and the effective delivered amount.
 *
 * @example
 * const estimation = await estimateIntent({ intent });
 *
 * @throws {NoActiveAccountError} when no account is active.
 * @throws when estimation fails, yields no/many data entries, or no estimate.
 */
export async function estimateIntent(parameters: EstimateIntentParameters): Promise<IntentEstimation> {
  const config = resolveConfig(parameters.config);
  const { intent } = parameters;

  const activeAccount = getActiveAccount({ config });
  if (!activeAccount) throw new NoActiveAccountError();
  const activeAccountId = activeAccount.id;

  const balances = await config.storage.getBalancesByCurrencyAndNetwork(
    activeAccountId,
    intent.currency.contractAddress,
    toSlug(intent.network.name),
  );

  const { plan: draftPlan, usedBalances } = generatePlan(balances, intent, {
    checkBytecode: (n, a) => hasBytecode({ network: n, address: a, config }),
    maxInputs: getProtocol({ config }).proving.aggregation.maxInputs,
  });

  const result = await estimatePlanTree(config, draftPlan, undefined);
  if (!result.success) {
    throw result.error;
  }

  invariant(result.data, "Estimation resulted in no data, expected a single BalanceEntry.");

  invariant(
    !Array.isArray(result.data),
    "Estimation resulted in multiple data entries, expected a single BalanceEntry.",
  );

  invariant(result.estimate, "Estimation resulted in no estimate data.");

  return {
    plan: result.estimatedPlan,
    usedBalances,
    gas: result.estimate.gasFeeInCurrency,
    curvyFee: result.estimate.curvyFeeInCurrency,
    bridgeFee: result.estimate.bridgeFeeInCurrency,
    effectiveAmount: result.data.balance,
  };
}

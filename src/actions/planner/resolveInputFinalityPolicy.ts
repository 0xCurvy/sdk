import type { CurvyConfig } from "@/config/types";
import type { Intent } from "@/planner/types";
import type { InputFinalityPolicy } from "@/types/storage";

type ResolveInputFinalityPolicyOptions = {
  config: CurvyConfig;
  accountId: string;
  networkSlug: string;
  intent: Intent;
  mandatory?: InputFinalityPolicy;
};

/** Resolve integration constraint, intent override, account preference, then product default. */
export async function resolveInputFinalityPolicy(
  options: ResolveInputFinalityPolicyOptions,
): Promise<InputFinalityPolicy> {
  if (options.mandatory === "finalized") return "finalized";
  if (options.intent.inputFinalityPolicy) return options.intent.inputFinalityPolicy;
  const preference = await options.config.storage.getFinalityPreference(options.accountId, options.networkSlug);
  return preference.requireFinalizedFunds ? "finalized" : "included";
}

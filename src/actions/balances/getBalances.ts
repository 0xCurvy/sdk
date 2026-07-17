import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NoActiveAccountError } from "@/errors";
import type { BalanceEntry, InputFinalityPolicy } from "@/types/storage";
import { refreshBalances } from "./refreshBalances";

export type GetBalancesParameters = WithConfig<{
  /** When `false`, refresh from chain first. Defaults to `true` (cached). */
  cached?: boolean;
  /** Target a specific account; defaults to the active account. */
  accountId?: string;
  /** Override account preference for this read. */
  inputFinalityPolicy?: InputFinalityPolicy;
}>;

/**
 * Get an account's shielded balances from storage, optionally refreshing first.
 *
 * @example
 * await getBalances();                       // active account, cached
 * await getBalances({ accountId });           // explicit account
 * await getBalances({ cached: false });      // refresh from chain first
 *
 * @throws {NoActiveAccountError} when no `accountId` is given and no account is active.
 */
export async function getBalances(parameters: GetBalancesParameters = {}): Promise<BalanceEntry[]> {
  const config = resolveConfig(parameters.config);
  const accountId = parameters.accountId ?? config.state.activeAccountId;
  if (!accountId) throw new NoActiveAccountError();

  if (parameters.cached === false) {
    await refreshBalances({ accountId, config });
  }

  const durable = await config.storage.getBalances(accountId, config.state.environment);
  const slugs = new Set([
    ...durable.map((entry) => entry.networkSlug),
    ...config.state.activeNetworks.map((n) => n.slug),
  ]);
  const projected: BalanceEntry[] = [];
  for (const networkSlug of slugs) {
    const preference = await config.storage.getFinalityPreference(accountId, networkSlug);
    const policy = parameters.inputFinalityPolicy ?? (preference.requireFinalizedFunds ? "finalized" : "included");
    projected.push(...(await config.storage.getProjectedBalances(accountId, networkSlug, policy)));
  }
  return projected;
}

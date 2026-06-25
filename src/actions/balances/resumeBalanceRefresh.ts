import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NoActiveAccountError } from "@/errors";

export type ResumeBalanceRefreshParameters = WithConfig<{ accountId?: string }>;

/**
 * Clear the per-account balance-refresh lock so `refreshBalances` for that
 * account may run again (port of `BalanceScanner.resumeBalanceRefreshForAccount`).
 *
 * Defaults `accountId` to the active account (`state.activeAccountId`).
 *
 * @example
 * resumeBalanceRefresh();             // active account
 * resumeBalanceRefresh({ accountId }); // explicit account
 */
export function resumeBalanceRefresh(parameters: ResumeBalanceRefreshParameters = {}): void {
  const config = resolveConfig(parameters.config);
  const accountId = parameters.accountId ?? config.state.activeAccountId;
  if (!accountId) throw new NoActiveAccountError();
  config._internal.scanLocks.set(`refresh-account-${accountId}`, false);
}

import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NoActiveAccountError } from "@/errors";

export type PauseBalanceRefreshParameters = WithConfig<{ accountId?: string }>;

/**
 * Set the per-account balance-refresh lock so an in-flight or future
 * `refreshBalances` for that account is short-circuited (port of
 * `BalanceScanner.pauseBalanceRefreshForAccount`).
 *
 * Defaults `accountId` to the active account (`state.activeAccountId`).
 *
 * @example
 * pauseBalanceRefresh();             // active account
 * pauseBalanceRefresh({ accountId }); // explicit account
 */
export function pauseBalanceRefresh(parameters: PauseBalanceRefreshParameters = {}): void {
  const config = resolveConfig(parameters.config);
  const accountId = parameters.accountId ?? config.state.activeAccountId;
  if (!accountId) throw new NoActiveAccountError();
  config._internal.scanLocks.set(`refresh-account-${accountId}`, true);
}

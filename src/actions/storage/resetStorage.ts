import { refreshBalances } from "@/actions/balances/refreshBalances";
import { resolveConfig } from "@/config/global";
import { startPriceRefresh, stopPriceRefresh } from "@/config/priceRefresh";
import type { WithConfig } from "@/config/types";

export type ResetStorageParameters = WithConfig;

/**
 * Clear all persisted storage and rebuild it from the live account registry:
 *
 * 1. stop the price-refresh timer,
 * 2. clear storage,
 * 3. restart the price-refresh timer (running once immediately),
 * 4. re-insert each known account, then
 * 5. refresh balances for each.
 *
 * Accounts are sourced from `state.accounts` (the registered-account metadata),
 * which naturally excludes partial accounts — they have no metadata and carry no
 * balances worth restoring.
 *
 * @example
 * await resetStorage();
 */
export async function resetStorage(parameters: ResetStorageParameters = {}): Promise<void> {
  const config = resolveConfig(parameters.config);

  stopPriceRefresh(config);
  await config.storage.clearStorage();
  startPriceRefresh(config, { runImmediately: true });

  const accounts = Object.values(config.state.accounts);

  for (const account of accounts) {
    await config.storage.insertCurvyAccount(account);
  }

  for (const account of accounts) {
    await refreshBalances({ accountId: account.id, config });
  }
}

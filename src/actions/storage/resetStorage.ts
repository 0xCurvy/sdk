import { refreshBalances } from "@/actions/balances/refreshBalances";
import { resolveConfig } from "@/config/global";
import { startPriceRefresh, stopPriceRefresh } from "@/config/priceRefresh";
import type { WithConfig } from "@/config/types";

export type ResetStorageParameters = WithConfig;

/**
 * Clear chain-derived cache and rebuild it from the live account registry:
 *
 * 1. stop the price-refresh timer,
 * 2. atomically clear balances, notes-tree state, and the hot projection,
 * 3. restart the price-refresh timer (running once immediately),
 * 4. ensure each known account remains persisted, then
 * 5. refresh balances for each.
 *
 * Finalized transaction history and locally-authored transfer workflow records
 * are preserved. Account discovery cursors are reset so the next sync backfills
 * every committed note instead of skipping leaves from the cleared tree.
 *
 * @example
 * await resetStorage();
 */
export async function resetStorage(parameters: ResetStorageParameters = {}): Promise<void> {
  const config = resolveConfig(parameters.config);

  await Promise.allSettled(config._internal.inflightRefreshes.values());

  stopPriceRefresh(config);
  try {
    await config.storage.clearCachedData();
    config._internal.notesTrees.clear();
    config._internal.finalizedNotesTrees.clear();
  } finally {
    startPriceRefresh(config, { runImmediately: true });
  }

  const accounts = Object.values(config.state.accounts);

  for (const account of accounts) {
    await config.storage.upsertCurvyAccount(account);
    const persisted = await config.storage.getCurvyAccountDataById(account.id);
    await config.storage.replaceCurvyAccountData(account.id, {
      ...persisted,
      scanCursors: { latest: undefined, oldest: undefined },
      discoveryCursors: {},
    });
  }

  for (const account of accounts) {
    await refreshBalances({ accountId: account.id, config });
  }
}

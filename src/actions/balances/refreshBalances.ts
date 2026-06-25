import { syncNotes } from "@/actions/notes/syncNotes";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NoActiveAccountError } from "@/errors";
import type { RefreshOptions } from "@/types/account";

export type RefreshBalancesParameters = WithConfig<RefreshOptions & { accountId?: string }>;

/**
 * Re-sync and persist an account's shielded balances.
 *
 * Owns the state-store + event-emitter choreography: flip `state.scan`, emit
 * `balance-refresh-*`, and guard re-entrancy with a per-`accountId` lock. The
 * actual work delegates to {@link syncNotes}, which folds the notes-tree delta,
 * discovers owned notes locally (WASM-Core ECDH), reconciles spends, and writes
 * balance entries + tx history through `config.storage` for every active
 * aggregator network. A wallet with no such network is a graceful no-op.
 *
 * @example
 * await refreshBalances();               // active account
 * await refreshBalances({ accountId });   // explicit account
 */
export async function refreshBalances(parameters: RefreshBalancesParameters = {}): Promise<void> {
  const config = resolveConfig(parameters.config);
  const accountId = parameters.accountId ?? config.state.activeAccountId;
  if (!accountId) throw new NoActiveAccountError();

  const lockKey = `refresh-account-${accountId}`;
  if (config._internal.scanLocks.get(lockKey)) return;
  config._internal.scanLocks.set(lockKey, true);

  const { environment } = config.state;
  config.setState({ scan: { status: "scanning", progress: 0, accountId } });
  if (!parameters.silent) config.emitter.emitBalanceRefreshStarted({ accountId, environment });

  try {
    parameters.signal?.throwIfAborted();

    await syncNotes({ accountId, config });

    config.setState({ scan: { status: "idle", progress: 100, accountId } });
    if (!parameters.silent) config.emitter.emitBalanceRefreshComplete({ accountId, environment });
  } catch (error) {
    config.setState({ scan: { status: "error", progress: 0, accountId } });
    if (
      (error instanceof Error && error.cause === "abort") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      config.emitter.emitBalanceRefreshCancelled({ reason: error.message, environment });
      return;
    }
    throw error;
  } finally {
    config._internal.scanLocks.set(lockKey, false);
  }
}

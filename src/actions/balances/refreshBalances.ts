import { syncNotes } from "@/actions/notes/syncNotes";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NoActiveAccountError, ScanError } from "@/errors";
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
  if (config._internal.scanLocks.get(lockKey)) {
    // Coalesce concurrent refreshes so callers observe the same completed sync.
    // A lock without a promise represents a paused or externally held refresh.
    const inflight = config._internal.inflightRefreshes.get(lockKey);
    if (inflight) return inflight;
    return;
  }
  config._internal.scanLocks.set(lockKey, true);

  const run = (async () => {
    const { environment } = config.state;
    config.setState({ scan: { status: "scanning", progress: 0, accountId } });
    if (!parameters.silent) config.emitter.emitBalanceRefreshStarted({ accountId, environment });

    try {
      parameters.signal?.throwIfAborted();

      await syncNotes({ accountId, config, signal: parameters.signal });

      config.setState({ scan: { status: "idle", progress: 100, accountId } });
      if (!parameters.silent) config.emitter.emitBalanceRefreshComplete({ accountId, environment });
    } catch (error) {
      // Abort reasons may be strings, so the signal state is authoritative.
      const cancelled =
        parameters.signal?.aborted === true ||
        (error instanceof Error && (error.cause === "abort" || error.name === "AbortError"));
      if (cancelled) {
        // Cancellation returns the scan to idle and emits its dedicated event.
        config.setState({ scan: { status: "idle", progress: 0, accountId } });
        const reason = error instanceof Error ? error.message : typeof error === "string" ? error : "aborted";
        config.emitter.emitBalanceRefreshCancelled({ reason, environment });
        return;
      }
      config.setState({ scan: { status: "error", progress: 0, accountId } });
      const scanError =
        error instanceof ScanError ? error : new ScanError(error instanceof Error ? error.message : String(error));
      if (!parameters.silent) config.emitter.emitBalanceRefreshError({ error: scanError, environment });
      throw error;
    } finally {
      config._internal.scanLocks.set(lockKey, false);
    }
  })();

  config._internal.inflightRefreshes.set(lockKey, run);
  try {
    await run;
  } finally {
    config._internal.inflightRefreshes.delete(lockKey);
  }
}

import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { stopJwtRefresh } from "../auth/internal/session";

export type RemoveAccountParameters = WithConfig<{ accountId: string }>;

/**
 * Evict an account from the runtime without re-pointing the session.
 *
 * Removes the account's keypairs from `config.keyring`, its keystore entry, and
 * its `state.accounts` metadata (when registered). Durable storage is left
 * intact — same as `logout` — so a registered account can be restored on a
 * later login.
 *
 * Unlike `logout`, this does NOT clear the bearer token or auto-activate another
 * account; it only clears `activeAccountId` (and stops the JWT refresh timer)
 * when the removed account WAS the active one. This makes it safe to evict an
 * ephemeral/partial account while a different account stays authenticated —
 * the primary use case is cleaning up temp keypairs created via
 * `addPartialAccount` (public-swap, STA-claim). Idempotent: removing an unknown
 * id is a no-op.
 *
 * @example
 * await removeAccount({ accountId });
 */
export async function removeAccount(parameters: RemoveAccountParameters): Promise<void> {
  const config = resolveConfig(parameters.config);
  const { accountId } = parameters;

  if (!config.keyring.has(accountId)) return;

  config.keyring.delete(accountId);
  config.keystore?.delete(accountId);

  if (config.state.accounts[accountId]) {
    config.setState((state) => {
      const { [accountId]: _removed, ...rest } = state.accounts;
      return { accounts: rest };
    });
  }

  // Only touch the session when the removed account was the active one.
  if (config.state.activeAccountId === accountId) {
    stopJwtRefresh(config);
    config.api.updateBearerToken(undefined);
    config.setState({ activeAccountId: null });
  }
}

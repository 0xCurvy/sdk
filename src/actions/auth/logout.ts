import { setActiveAccount } from "@/actions";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { AccountError } from "@/errors";
import { stopJwtRefresh } from "./internal/session";

export type LogoutParameters = WithConfig<{ accountId?: string }>;

/**
 * Remove an account and re-point (or clear) the active account. Defaults to the
 * active account id.
 *
 * Stops the JWT refresh timer, clears the bearer token, deletes the account's
 * keyring entry (and its metadata + keystore entry), then activates the next
 * remaining REGISTERED account (re-authenticating it) — preferring a full
 * account over a partial (unauthenticated, handle-less) one. If only partials
 * remain, `activeAccountId` is cleared.
 *
 * @example
 * await logout();             // active account
 * await logout({ accountId }); // explicit account
 */
export async function logout(parameters: LogoutParameters = {}): Promise<void> {
  const config = resolveConfig(parameters.config);
  const accountId = parameters.accountId ?? config.state.activeAccountId;

  if (!accountId || !config.keyring.has(accountId)) {
    throw new AccountError(`Account with id ${accountId} does not exist.`, accountId ?? undefined);
  }

  stopJwtRefresh(config);
  config.api.updateBearerToken(undefined);
  config.keyring.delete(accountId);
  config.keystore?.delete(accountId);

  config.setState((state) => {
    const { [accountId]: _removed, ...rest } = state.accounts;
    return { accounts: rest };
  });

  // Prefer a registered account (one with a `state.accounts` entry) so logout
  // never activates a partial (unauthenticated) account. Only fall back to
  // clearing the active account when every remaining keyring entry is a partial.
  const { accounts } = config.state;
  const nextAccountId = [...config.keyring.keys()].find((id) => accounts[id] != null);
  if (nextAccountId) {
    await setActiveAccount({ config, accountId: nextAccountId });
    return;
  }

  config.setState({ activeAccountId: null });
}

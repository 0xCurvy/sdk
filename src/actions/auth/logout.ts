import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { setActiveAccount } from "../account/setActiveAccount";
import { stopJwtRefresh } from "./internal/session";

export type LogoutParameters = WithConfig<{ accountId?: string }>;

/**
 * Remove a account and re-point (or clear) the active account. Defaults to the
 * active account id.
 *
 * Stops the JWT refresh timer, clears the bearer token, deletes the account's
 * keyring entry (and its metadata + keystore entry), then either makes the first
 * remaining account active (re-authenticating it) or clears `activeAccountId`.
 *
 * @example
 * await logout();             // active account
 * await logout({ accountId }); // explicit account
 */
export async function logout(parameters: LogoutParameters = {}): Promise<void> {
  const config = resolveConfig(parameters.config);
  const accountId = parameters.accountId ?? config.state.activeAccountId;

  if (!accountId || !config.keyring.has(accountId)) {
    throw new Error(`Account with id ${accountId} does not exist.`);
  }

  stopJwtRefresh(config);
  config.api.updateBearerToken(undefined);
  config.keyring.delete(accountId);
  config.keystore?.delete(accountId);

  config.setState((state) => {
    const { [accountId]: _removed, ...rest } = state.accounts;
    return { accounts: rest };
  });

  const nextAccountId = config.keyring.keys().next().value;
  if (nextAccountId) {
    await setActiveAccount({ config, accountId: nextAccountId });
    return;
  }

  config.setState({ activeAccountId: null });
  return;
}

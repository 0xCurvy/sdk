import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { requireSpendKey } from "@/utils/keys";
import { startJwtRefresh, updateBearerToken } from "../auth/internal/session";

export type SetActiveAccountParameters = WithConfig<{
  accountId: string;
  skipBearerTokenUpdate?: boolean;
}>;

/**
 * Make `accountId` the active account.
 *
 * Resolves the keypairs from `config.keyring`, records the id in
 * `state.activeAccountId`, refreshes the bearer token (unless skipped or the
 * account is partial — i.e. not registered in `state.accounts`), and (re)starts
 * the JWT refresh timer.
 *
 * @example
 * await setActiveAccount({ accountId });
 */
export async function setActiveAccount(parameters: SetActiveAccountParameters): Promise<void> {
  const config = resolveConfig(parameters.config);
  const { accountId, skipBearerTokenUpdate = false } = parameters;

  const keyPairs = config.keyring.get(accountId);
  if (!keyPairs) {
    throw new Error(`Account with id ${accountId} does not exist.`);
  }

  config.setState({ activeAccountId: accountId });

  // Registered (full) accounts have metadata in `state.accounts`; partials don't.
  const isRegistered = config.state.accounts[accountId] != null;
  if (!skipBearerTokenUpdate && isRegistered) {
    await updateBearerToken(config, requireSpendKey(keyPairs));
  }

  startJwtRefresh(config);
}

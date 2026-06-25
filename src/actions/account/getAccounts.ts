import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyAccountData } from "@/types/account";

export type GetAccountsParameters = WithConfig;

/**
 * Get the serializable metadata for every known account.
 *
 * @example
 * const accounts = getAccounts();
 */
export function getAccounts(parameters: GetAccountsParameters = {}): CurvyAccountData[] {
  const config = resolveConfig(parameters.config);
  return Object.values(config.state.accounts);
}

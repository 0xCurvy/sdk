import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyAccountData } from "@/types/account";

export type GetActiveAccountParameters = WithConfig;

/**
 * Get the active account's registered profile metadata. Temporary swap/recovery
 * accounts have no profile and return `null`; use `getActiveAccountId` for identity.
 *
 * @example
 * const account = getActiveAccount();
 */
export function getActiveAccount(parameters: GetActiveAccountParameters = {}): CurvyAccountData | null {
  const config = resolveConfig(parameters.config);
  const id = config.state.activeAccountId;
  return id ? (config.state.accounts[id] ?? null) : null;
}

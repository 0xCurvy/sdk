import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyAccountData } from "@/types/account";

export type GetAccountByIdParameters = WithConfig<{ id: string }>;

/**
 * Get a single account's serializable metadata by id, or `undefined` if unknown.
 *
 * @example
 * const account = getAccountById({ id });
 */
export function getAccountById(parameters: GetAccountByIdParameters): CurvyAccountData | undefined {
  const config = resolveConfig(parameters.config);
  return config.state.accounts[parameters.id];
}

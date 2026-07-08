import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";

export type HasAccountParameters = WithConfig<{ id: string }>;

/**
 * Check whether an account with the given id is known.
 *
 * @example
 * if (hasAccount({ id })) { ... }
 */
export function hasAccount(parameters: HasAccountParameters): boolean {
  const config = resolveConfig(parameters.config);
  return parameters.id in config.state.accounts;
}

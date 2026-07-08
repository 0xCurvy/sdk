import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";

export type HasActiveAccountParameters = WithConfig;

/**
 * Check whether an account is currently active.
 *
 * @example
 * if (hasActiveAccount()) { ... }
 */
export function hasActiveAccount(parameters: HasActiveAccountParameters = {}): boolean {
  const config = resolveConfig(parameters.config);
  return config.state.activeAccountId !== null;
}

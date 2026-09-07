import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";

export type GetActiveAccountIdParameters = WithConfig;

/**
 * Get the selected account ID, including temporary swap/recovery accounts.
 * Returns `null` when no account is selected. This identifies the account;
 * signing actions separately require its keys to be available.
 */
export function getActiveAccountId(parameters: GetActiveAccountIdParameters = {}): string | null {
  return resolveConfig(parameters.config).state.activeAccountId;
}

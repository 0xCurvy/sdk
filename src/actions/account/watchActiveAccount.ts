import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyAccountData } from "@/types/account";

export type WatchActiveAccountParameters = WithConfig<{
  /** Invoked with the active account (or `null`) whenever it changes. */
  onChange: (account: CurvyAccountData | null) => void;
}>;

/**
 * Subscribe to changes of the active account; returns an unsubscribe function.
 *
 * @example
 * const unsubscribe = watchActiveAccount({ onChange: (account) => render(account) });
 */
export function watchActiveAccount(parameters: WatchActiveAccountParameters): () => void {
  const config = resolveConfig(parameters.config);
  const { onChange } = parameters;
  return config.subscribe(
    (state) => state.activeAccountId,
    (id) => onChange(id ? (config.state.accounts[id] ?? null) : null),
  );
}

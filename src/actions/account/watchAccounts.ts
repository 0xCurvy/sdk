import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyAccountData } from "@/types/account";

export type WatchAccountsParameters = WithConfig<{
  /** Invoked with the full account list whenever the set of accounts changes. */
  onChange: (accounts: CurvyAccountData[]) => void;
}>;

/**
 * Subscribe to changes of the known accounts; returns an unsubscribe function.
 *
 * @example
 * const unsubscribe = watchAccounts({ onChange: (accounts) => render(accounts) });
 */
export function watchAccounts(parameters: WatchAccountsParameters): () => void {
  const config = resolveConfig(parameters.config);
  const { onChange } = parameters;
  return config.subscribe(
    (state) => state.accounts,
    (accounts) => onChange(Object.values(accounts)),
  );
}

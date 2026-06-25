import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";

export type WatchEnvironmentParameters = WithConfig<{
  /** Invoked whenever the config's environment changes. */
  onChange: (environment: NETWORK_ENVIRONMENT_VALUES) => void;
}>;

/**
 * Subscribe to changes of the config's network environment.
 *
 * @example
 * const unsubscribe = watchEnvironment({ onChange: (env) => console.log(env) });
 * // later: unsubscribe();
 */
export function watchEnvironment(parameters: WatchEnvironmentParameters): () => void {
  const config = resolveConfig(parameters.config);
  // Wrap so `onChange` receives only the current environment (matching its
  // single-argument contract), not the store's `(current, previous)` pair.
  return config.subscribe(
    (state) => state.environment,
    (environment) => parameters.onChange(environment),
  );
}

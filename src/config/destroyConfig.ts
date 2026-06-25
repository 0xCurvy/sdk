import { peekCurvyConfig, resolveConfig, setCurvyConfig } from "./global";
import type { WithConfig } from "./types";

/**
 * Tear down a config: stop its timers and detach API listeners. If the config
 * being destroyed is the current ambient global, the global is cleared too.
 *
 * @example
 * await destroyConfig();              // tears down the ambient config
 * await destroyConfig({ config });    // tears down a specific config
 */
export async function destroyConfig(parameters: WithConfig = {}): Promise<void> {
  const config = resolveConfig(parameters.config);
  await config.destroy();
  if (peekCurvyConfig() === config) setCurvyConfig(null);
}

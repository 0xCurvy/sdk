import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { resolveConfig } from "./global";
import type { WithConfig } from "./types";

/**
 * The config's current network environment (`"mainnet"` | `"testnet"`).
 *
 * @example
 * const env = getEnvironment();
 */
export function getEnvironment(parameters: WithConfig = {}): NETWORK_ENVIRONMENT_VALUES {
  return resolveConfig(parameters.config).state.environment;
}

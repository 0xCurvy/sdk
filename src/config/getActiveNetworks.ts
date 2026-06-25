import type { Network } from "@/types/api";
import { resolveConfig } from "./global";
import type { WithConfig } from "./types";

/**
 * The networks active for the config's current environment.
 *
 * @example
 * const networks = getActiveNetworks();
 */
export function getActiveNetworks(parameters: WithConfig = {}): Network[] {
  return resolveConfig(parameters.config).state.activeNetworks;
}

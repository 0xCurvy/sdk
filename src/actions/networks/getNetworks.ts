import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { Network } from "@/types/api";
import { filterNetworks, type NetworkFilter } from "@/utils/network";

export type GetNetworksParameters = WithConfig<{
  /** Optional filter (slug, id, array, boolean testnet flag, or callback). */
  filter?: NetworkFilter;
}>;

/**
 * Get the known networks, optionally narrowed by a filter.
 *
 * @example
 * const all = getNetworks();                       // every known network
 * const testnets = getNetworks({ filter: true });  // testnets only
 * const sepolia = getNetworks({ filter: "ethereum-sepolia" });
 */
export function getNetworks(parameters: GetNetworksParameters = {}): Network[] {
  const config = resolveConfig(parameters.config);
  return filterNetworks(config.state.networks, parameters.filter);
}

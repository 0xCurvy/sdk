import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NetworkError } from "@/errors";
import type { Network } from "@/types/api";
import { filterNetworks, type NetworkFilter } from "@/utils/network";

export type GetNetworkParameters = WithConfig<{
  /** Optional filter (slug, id, array, boolean testnet flag, or callback). */
  filter?: NetworkFilter;
}>;

/**
 * Get exactly one network matching the filter, throwing if zero or many match.
 *
 * @example
 * const ethereum = getNetwork({ filter: "ethereum" });
 *
 * @throws when no network matches or more than one network matches.
 */
export function getNetwork(parameters: GetNetworkParameters = {}): Network {
  const config = resolveConfig(parameters.config);
  const networkFilter = parameters.filter;
  const networks = filterNetworks(config.state.networks, networkFilter);

  if (networks.length === 0) {
    throw new NetworkError(`Expected exactly one, but no network found with filter ${networkFilter}`);
  }

  if (networks.length > 1) {
    throw new NetworkError(`Expected exactly one, but more than one network found with filter ${networkFilter}`);
  }

  return networks[0];
}

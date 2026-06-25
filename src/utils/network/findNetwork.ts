import type { Network } from "@/types/api";
import { filterNetworks, type NetworkFilter } from "@/utils/network/filterNetworks";

export function findNetwork(networks: Network[], networkFilter: NetworkFilter): Network | undefined {
  const filteredNetworks = filterNetworks(networks, networkFilter);

  if (filteredNetworks.length === 0) return undefined;
  if (filteredNetworks.length > 1) throw new Error(`More than one network found for filter: ${networkFilter}`);

  return filteredNetworks[0];
}

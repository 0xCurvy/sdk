import type { Network } from "@/types/api";
import { toSlug } from "@/utils/format/toSlug";

// Network filter can be:
// - string: slug format, e.g. "ethereum-sepolia"
// - number: Curvy ID of the network
// - callback: Filter callback function that takes Network as argument
// - boolean: Indicates whether we should connect to all mainnets (false) or all testnets (true)
// - undefined: We want to return all
export type NetworkFilter =
  | string
  | string[]
  | number
  | number[]
  | ((network: Network) => boolean)
  | boolean
  | undefined;

export function filterNetworks(networks: Network[], networkFilter: NetworkFilter): Network[] {
  if (networkFilter === undefined) {
    return networks;
  }

  const isNumber = (item: string | number): item is number => typeof item === "number" || !Number.isNaN(Number(item));

  return networks.filter((network) => {
    // Is NetworkFilter an array?
    if (Array.isArray(networkFilter)) {
      // An empty filter array selects nothing.
      if (networkFilter.length === 0) {
        return false;
      }
      // Is NetworkFilter a number (or numeric-string) array?
      if (networkFilter.every((item) => isNumber(item))) {
        // Coerce both sides to numbers so numeric-string ids (e.g. ["1", "2"]) match.
        return networkFilter.map(Number).includes(network.id);
      }
      // NetworkFilter must be a string array
      else return networkFilter.map((n) => toSlug(String(n))).includes(toSlug(network.name));

      // NetworkFilter is a testnet boolean
    } else if (typeof networkFilter === "boolean") {
      return network.testnet === networkFilter;
      // NetworkFilter is a custom filter callback
    } else if (typeof networkFilter === "function") {
      return networkFilter(network);
      // NetworkFilter is a number (or number string)
    } else if (isNumber(networkFilter)) {
      return Number(networkFilter) === network.id;
      // NetworkFilter is a regular string
    } else {
      return toSlug(networkFilter) === toSlug(network.name);
    }
  });
}

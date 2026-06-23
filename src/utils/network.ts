import type { Network } from "@/types/api";
import type { CurrencyMetadata } from "@/types/storage";
import { toSlug } from "@/utils/helpers";

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

  const isNumber = (item: string | number): item is number => {
    if (typeof item === "number") return Number.isFinite(item);
    return /^\d+(?:\.0+)?$/.test(item);
  };

  return networks.filter((network) => {
    // Is NetworkFilter an array?
    if (Array.isArray(networkFilter)) {
      // Is NetworkFilter a number array?
      if (networkFilter.every((item) => isNumber(item))) {
        return networkFilter.includes(network.id);
      }
      // NetworkFilter must be a string array
      else return networkFilter.map((n) => toSlug(n)).includes(toSlug(network.name));

      // NetworkFilter is a testnet boolean
    } else if (typeof networkFilter === "boolean") {
      return network.testnet === networkFilter;
      // NetworkFilter is a custom filter callback
    } else if (typeof networkFilter === "function") {
      return networkFilter(network);
      // NetworkFilter is a number (or number string)
    } else if (isNumber(networkFilter)) {
      return Number(networkFilter) === network.id;
      // Invalid numeric filters cannot match a network
    } else if (typeof networkFilter === "number") {
      return false;
      // NetworkFilter is a regular string
    } else {
      return toSlug(networkFilter) === toSlug(network.name);
    }
  });
}

export function findNetwork(networks: Network[], networkFilter: NetworkFilter): Network | undefined {
  const filteredNetworks = filterNetworks(networks, networkFilter);

  if (filteredNetworks.length === 0) return undefined;
  if (filteredNetworks.length > 1) throw new Error(`More than one network found for filter: ${networkFilter}`);

  return filteredNetworks[0];
}

const networksToPriceData = (networks: Network[]) => {
  return networks.reduce((res, network) => {
    for (const { price, symbol, decimals } of network.currencies) {
      if (!price) continue;
      if (res.has(symbol)) continue;

      res.set(symbol, { price, decimals });
    }
    return res;
  }, new Map<string, { price: string; decimals: number }>());
};

const networksToCurrencyMetadata = (networks: Network[]) => {
  return networks.reduce((res, network) => {
    for (const {
      decimals,
      iconUrl,
      name,
      nativeCurrency,
      symbol,
      contractAddress: address,
      vaultTokenId,
    } of network.currencies) {
      const currencyMetadataKey = `${address}-${toSlug(network.name)}`;
      if (res.has(currencyMetadataKey)) continue;

      res.set(currencyMetadataKey, {
        decimals,
        iconUrl,
        name,
        symbol,
        address,
        vaultTokenId: vaultTokenId?.toString(),
        native: nativeCurrency,
        networkSlug: toSlug(network.name),
        environment: network.testnet ? "testnet" : "mainnet",
      });
    }
    return res;
  }, new Map<string, CurrencyMetadata>());
};

export { networksToPriceData, networksToCurrencyMetadata };

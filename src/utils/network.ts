import type { TOKENS } from "@/constants/networks";
import type { Network } from "@/types/api";
import type { CurrencyMetadata } from "@/types/storage";
import { toSlug } from "@/utils/helpers";

// Network filter can be:
// - string: slug format, e.g. "ethereum-sepolia"
// - number: Curvy ID of the network
// - callback: Filter callback function that takes Network as argument
// - boolean: Indicates whether we should connect to all mainnets (false) or all testnets (true)
// - undefined: We want to return all
// TODO: Think about renaming to NetworkSelector
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
      // NetworkFilter is a regular string
    } else {
      return toSlug(networkFilter) === toSlug(network.name);
    }
  });
}

const networksToPriceData = (networks: Network[]) => {
  return networks.reduce((res, network) => {
    for (const { price, symbol, decimals } of network.currencies) {
      if (!price) continue;
      if (res.has(symbol)) continue;

      res.set(symbol, { price, decimals });
    }
    return res;
  }, new Map<TOKENS, { price: string; decimals: number }>());
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
      ...rest
    } of network.currencies) {
      const currencyMetadataKey = `${address}-${toSlug(network.name)}`;
      if (res.has(currencyMetadataKey)) continue;

      res.set(currencyMetadataKey, {
        decimals,
        iconUrl,
        name,
        symbol,
        address,
        native: nativeCurrency,
        networkSlug: toSlug(network.name),
        erc1155TokenId: rest.erc1155Enabled && rest.erc1155TokenId ? BigInt(rest.erc1155TokenId) : undefined,
        environment: network.testnet ? "testnet" : "mainnet",
      });
    }
    return res;
  }, new Map<string, CurrencyMetadata>());
};

export { networksToPriceData, networksToCurrencyMetadata };

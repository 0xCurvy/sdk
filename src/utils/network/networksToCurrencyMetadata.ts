import type { Network } from "@/types/api";
import type { CurrencyMetadata } from "@/types/storage";
import { toSlug } from "@/utils/format/toSlug";

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

export { networksToCurrencyMetadata };

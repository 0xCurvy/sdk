import { defineChain } from "viem";
import type { HexString } from "@/types";
import type { Network } from "@/types/api";

//@TODO:Handle better, through .env var, with this being the default value
const getUniversalResolverAddress = () => {
  return "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe";
};

const generateViemChainFromNetwork = (network: Network) => {
  const nativeCurrency = network.currencies.find((c) => c.nativeCurrency);

  // TODO: Handle this mapping in a better way, add to db but restrict usage
  const nativeCurrencyMappings = {
    Polygon: { name: "POL", symbol: "POL", decimals: 18 },
    Bsc: { name: "BNB", symbol: "BNB", decimals: 18 },
    Gnosis: { name: "xDAI", symbol: "xDAI", decimals: 18 },
    // https://github.com/wevm/viem/blob/0cb1b2ec035b92be6f44df346c7ca8944e876ad8/src/chains/definitions/tempo.ts#L14-L18
    Tempo: { name: "USD", symbol: "USD", decimals: 6 },
  } as const;

  const { name, symbol, decimals } =
    nativeCurrency || nativeCurrencyMappings[network.name as keyof typeof nativeCurrencyMappings];

  if (!name || !symbol || !decimals) {
    throw new Error(`No native currency found for network: ${network.name}`);
  }

  const {
    aggregatorContractAddress,
    vaultContractAddress,
    tokenBridgeContractAddress,
    tokenMoverContractAddress,
    portalFactoryContractAddress,
    vaultContractVersion,
    multiCallContractAddress,
    chainId,
    testnet,
    blockExplorerUrl,
    rpcUrl,
  } = network;

  return defineChain({
    id: Number(chainId),
    name: network.name,
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: `${network.name}-explorer`,
        url: blockExplorerUrl,
      },
    },
    nativeCurrency: {
      name,
      symbol,
      decimals,
    },
    contracts: {
      ensUniversalResolver: {
        address: getUniversalResolverAddress() as HexString,
      },
      multicall3: {
        address: multiCallContractAddress as HexString,
      },
    },
    /**
     * @deprecated Use parameters from extendedSchema
     */
    custom: {
      aggregatorContractAddress,
      vaultContractAddress,
      tokenBridgeContractAddress,
      tokenMoverContractAddress,
      portalFactoryContractAddress,
      vaultContractVersion,
    },
    testnet,
  });
};

export { generateViemChainFromNetwork };

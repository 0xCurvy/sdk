import { type Chain, type Client, defineChain, type HttpTransport, type PublicClient, type WalletClient } from "viem";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { HexString } from "@/types";
import type { Network } from "@/types/api";

// For future use
type CurvyClientActions = object;
type CurvyClientData = {
  readonly aggregatorContractAddress: string | undefined;
  readonly vaultContractAddress: string | undefined;
  readonly tokenBridgeContractAddress: string | undefined;
  readonly tokenMoverContractAddress: string | undefined;
  readonly portalFactoryContractAddress: string | undefined;
  readonly vaultContractVersion: string | undefined;
};
type CurvyClientConfiguration = CurvyClientActions & CurvyClientData;

type CurvyPublicClient = PublicClient<HttpTransport, Chain> & CurvyClientConfiguration;
type CurvyWalletClient = WalletClient<HttpTransport, Chain> & CurvyClientConfiguration;

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

const extendClientFromNetwork = (network: Network, _client: Client) => {
  const {
    aggregatorContractAddress,
    vaultContractAddress,
    tokenBridgeContractAddress,
    tokenMoverContractAddress,
    portalFactoryContractAddress,
    vaultContractVersion,
  } = network;

  return {
    aggregatorContractAddress,
    vaultContractAddress,
    tokenBridgeContractAddress,
    tokenMoverContractAddress,
    portalFactoryContractAddress,
    vaultContractVersion,
  };
};

const hasBytecode = async (sdk: ICurvySDK, network: Network, address: HexString) => {
  const client = sdk.rpcClient.Network(network.id).provider as CurvyPublicClient;

  const bytecode = await client.getCode({ address });
  return !!bytecode && bytecode !== "0x";
};

export {
  generateViemChainFromNetwork,
  extendClientFromNetwork,
  hasBytecode,
  type CurvyPublicClient,
  type CurvyWalletClient,
};

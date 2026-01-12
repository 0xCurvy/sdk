import type { BigNumberish } from "starknet";
import {
  type Account,
  type Address,
  type Chain,
  type ChainFormatters,
  type Client,
  defineChain,
  extendSchema,
  type HttpTransport,
  type ParseAccount,
  type PublicActions,
  type WalletActions,
} from "viem";
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

type CurvyViemChain = Chain<ChainFormatters, CurvyClientConfiguration>;

type CurvyPublicClientExtension = PublicActions<HttpTransport, CurvyViemChain> & CurvyClientConfiguration;
type CurvyWalletClientExtension = WalletActions<CurvyViemChain> & CurvyClientConfiguration;

type CurvyPublicClient = Client<
  HttpTransport,
  CurvyViemChain,
  Account | undefined,
  undefined,
  CurvyPublicClientExtension
>;
type CurvyWalletClient = Client<
  HttpTransport,
  CurvyViemChain,
  ParseAccount<Account | Address | undefined>,
  undefined,
  CurvyWalletClientExtension
>;

const generateViemChainFromNetwork = (network: Network) => {
  const nativeCurrency = network.currencies.find((c) => c.nativeCurrency);

  if (!nativeCurrency) {
    throw new Error(`No native currency found for network: ${network.name}`);
  }

  const { name, symbol, decimals } = nativeCurrency;

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
      ensUniversalResolver:
        network.group === "Ethereum"
          ? {
              address: "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe",
            }
          : undefined,
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
    extendSchema: extendSchema<CurvyClientConfiguration>(),
    testnet,
  }).extend({
    aggregatorContractAddress,
    vaultContractAddress,
    tokenBridgeContractAddress,
    tokenMoverContractAddress,
    portalFactoryContractAddress,
    vaultContractVersion,
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

const fromUint256 = (l: BigNumberish, h: BigNumberish): bigint => {
  const low = BigInt(l);
  const high = BigInt(h);

  const bhigh = high << 128n;
  return low + bhigh;
};

export {
  generateViemChainFromNetwork,
  fromUint256,
  extendClientFromNetwork,
  type CurvyPublicClient,
  type CurvyWalletClient,
};

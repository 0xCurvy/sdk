import type { ExtractValues } from "@/types/helper";

//#region NETWORK CONSTANTS -> Change required when adding new networks

const NETWORK_GROUP = {
  ETHEREUM: "Ethereum",
  STARKNET: "Starknet",
  ARBITRUM: "Arbitrum",
} as const;
type NETWORK_GROUP = typeof NETWORK_GROUP;
type NETWORK_GROUP_VALUES = ExtractValues<NETWORK_GROUP>;

const NETWORK_FLAVOUR = {
  EVM: "evm",
  STARKNET: "starknet",
} as const;
type NETWORK_FLAVOUR = typeof NETWORK_FLAVOUR;
type NETWORK_FLAVOUR_VALUES = ExtractValues<NETWORK_FLAVOUR>;

const EVM_MAINNETS = {
  ETHEREUM: "ethereum",
  ARBITRUM: "arbitrum",
} as const;
type EVM_MAINNETS = typeof EVM_MAINNETS;
type EVM_MAINNETS_VALUES = ExtractValues<EVM_MAINNETS>;

const EVM_TESTNETS = {
  ETHEREUM_SEPOLIA: "ethereum-sepolia",
  ARBITRUM_SEPOLIA: "arbitrum-sepolia",
} as const;
type EVM_TESTNETS = typeof EVM_TESTNETS;
type EVM_TESTNETS_VALUES = ExtractValues<EVM_TESTNETS>;

const STARKNET_MAINNETS = {
  STARKNET: "starknet",
} as const;
type STARKNET_MAINNETS = typeof STARKNET_MAINNETS;
type STARKNET_MAINNETS_VALUES = ExtractValues<STARKNET_MAINNETS>;

const STARKNET_TESTNETS = {
  STARKNET_SEPOLIA: "starknet-sepolia",
} as const;
type STARKNET_TESTNETS = typeof STARKNET_TESTNETS;
type STARKNET_TESTNETS_VALUES = ExtractValues<STARKNET_TESTNETS>;

//#endregion

//#region FLAVOUR CONSTANTS -> Change required when adding new flavours

const EVM_NETWORKS = {
  ...EVM_MAINNETS,
  ...EVM_TESTNETS,
};
type EVM_NETWORKS = EVM_MAINNETS_VALUES | EVM_TESTNETS_VALUES;

const STARKNET_NETWORKS = {
  ...STARKNET_MAINNETS,
  ...STARKNET_TESTNETS,
};
type STARKNET_NETWORKS = STARKNET_MAINNETS_VALUES | STARKNET_TESTNETS_VALUES;

const NETWORK_FLAVOUR_MAP: Map<NETWORKS, NETWORK_FLAVOUR_VALUES> = new Map([
  ...Object.values(EVM_NETWORKS).map((network) => [network, NETWORK_FLAVOUR.EVM] as const),
  ...Object.values(STARKNET_NETWORKS).map((network) => [network, NETWORK_FLAVOUR.STARKNET] as const),
]);

const SUPPORTED_MAINNETS = {
  ...EVM_MAINNETS,
  ...STARKNET_MAINNETS,
} as const;
type SUPPORTED_MAINNETS = typeof SUPPORTED_MAINNETS;
type SUPPORTED_MAINNETS_VALUES = ExtractValues<SUPPORTED_MAINNETS>;

const SUPPORTED_TESTNETS = {
  ...EVM_TESTNETS,
  ...STARKNET_TESTNETS,
} as const;
type SUPPORTED_TESTNETS = typeof SUPPORTED_TESTNETS;
type SUPPORTED_TESTNETS_VALUES = ExtractValues<SUPPORTED_TESTNETS>;

//#endregion

//#region Automatically generated / base types

type MAINNET_NETWORKS = SUPPORTED_MAINNETS_VALUES | (string & {});
type TESTNET_NETWORKS = SUPPORTED_TESTNETS_VALUES | (string & {});

const SUPPORTED_NETWORKS = {
  ...SUPPORTED_MAINNETS,
  ...SUPPORTED_TESTNETS,
} as const;
type SUPPORTED_NETWORKS = typeof SUPPORTED_NETWORKS;
type SUPPORTED_NETWORKS_VALUES = ExtractValues<SUPPORTED_NETWORKS>;

type NETWORKS = SUPPORTED_NETWORKS_VALUES | (string & {});

const isSupportedNetwork = (network: string): network is SUPPORTED_NETWORKS_VALUES => {
  return Object.values(SUPPORTED_NETWORKS).includes(network);
};

function assertSupportedNetwork(network: string): asserts network is SUPPORTED_NETWORKS_VALUES {
  if (!isSupportedNetwork(network)) throw new Error(`Unsupported network: ${network}`);
}

const NETWORK_ENVIRONMENT = {
  MAINNET: "mainnet",
  TESTNET: "testnet",
} as const;
type NETWORK_ENVIRONMENT = typeof NETWORK_ENVIRONMENT;
type NETWORK_ENVIRONMENT_VALUES = ExtractValues<NETWORK_ENVIRONMENT>;

type TOKENS =
  | (string & {})
  | "ETH"
  | "USDC"
  | "USDT"
  | "CRV"
  | "DAI"
  | "GRT"
  | "LDO"
  | "LINK"
  | "LORDS"
  | "MKR"
  | "NSTR"
  | "PENDLE"
  | "STRK"
  | "SUSHI"
  | "UNI"
  | "USDS"
  | "WBTC"
  | "ZRO"
  | "AAVE"
  | "ARB"
  | "COMP"
  | "COW";

//#endregion

export type {
  NETWORK_GROUP_VALUES,
  EVM_MAINNETS_VALUES,
  STARKNET_MAINNETS_VALUES,
  EVM_TESTNETS_VALUES,
  STARKNET_TESTNETS_VALUES,
  EVM_NETWORKS,
  STARKNET_NETWORKS,
  MAINNET_NETWORKS,
  TESTNET_NETWORKS,
  NETWORKS,
  TOKENS,
  NETWORK_ENVIRONMENT_VALUES,
  NETWORK_FLAVOUR_VALUES,
};

export {
  NETWORK_ENVIRONMENT,
  SUPPORTED_NETWORKS,
  SUPPORTED_MAINNETS,
  SUPPORTED_TESTNETS,
  isSupportedNetwork,
  assertSupportedNetwork,
  NETWORK_FLAVOUR,
  NETWORK_GROUP,
  NETWORK_FLAVOUR_MAP,
};

import type { ExtractValues } from "@/types/helper";

const NETWORK_FLAVOUR = {
  EVM: "evm",
  SOLANA: "solana",
} as const;
type NETWORK_FLAVOUR = typeof NETWORK_FLAVOUR;
type NETWORK_FLAVOUR_VALUES = ExtractValues<NETWORK_FLAVOUR>;

const NETWORK_ENVIRONMENT = {
  MAINNET: "mainnet",
  TESTNET: "testnet",
} as const;
type NETWORK_ENVIRONMENT = typeof NETWORK_ENVIRONMENT;
type NETWORK_ENVIRONMENT_VALUES = ExtractValues<NETWORK_ENVIRONMENT>;

export type { NETWORK_ENVIRONMENT_VALUES, NETWORK_FLAVOUR_VALUES };

export { NETWORK_ENVIRONMENT, NETWORK_FLAVOUR };

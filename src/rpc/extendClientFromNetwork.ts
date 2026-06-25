import type { Client } from "viem";
import type { Network } from "@/types/api";

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

export { extendClientFromNetwork };

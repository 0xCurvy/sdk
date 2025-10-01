import { NETWORK_FLAVOUR } from "@/constants/networks";
import { EvmRpc } from "@/rpc/evm";
import { StarknetRpc } from "@/rpc/starknet";
import type { Network } from "@/types/api";
import { MultiRpc } from "./multi";

function newRpc(network: Network) {
  switch (network.flavour) {
    case NETWORK_FLAVOUR.EVM:
      return new EvmRpc(network);
    case NETWORK_FLAVOUR.STARKNET:
      return new StarknetRpc(network);
    default:
      throw Error("Unknown network flavour");
  }
}

function newMultiRpc(networks: Network[], filterCallback: (network: Network) => boolean = () => true) {
  const rpcs = networks.filter(filterCallback).map((network) => {
    return newRpc(network);
  });

  return new MultiRpc(rpcs);
}

export { newRpc, newMultiRpc };

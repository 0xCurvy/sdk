import { NETWORK_FLAVOUR } from "@/constants/networks";
import { EvmRpc } from "@/rpc/evm";
import { SolanaRpc } from "@/rpc/solana";
import type { Network } from "@/types/api";
import { MultiRpc } from "./multi";

function newRpc(network: Network) {
  switch (network.flavour) {
    case NETWORK_FLAVOUR.EVM:
      return new EvmRpc(network);
    case NETWORK_FLAVOUR.SOLANA:
      return new SolanaRpc(network);
    default:
      throw Error(`Unknown network flavour: ${network.flavour}`);
  }
}

function newMultiRpc(networks: Network[], filterCallback: (network: Network) => boolean = () => true) {
  const rpcs = networks.filter(filterCallback).map((network) => {
    return newRpc(network);
  });

  return new MultiRpc(rpcs);
}

export { newRpc, newMultiRpc };

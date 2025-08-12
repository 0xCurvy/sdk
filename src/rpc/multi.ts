import type { NETWORK_FLAVOUR } from "@/constants/networks";
import type { CurvyAddressBalances, EVMCurvyAddress, StarknetCurvyAddress } from "@/types/address";
import { type NetworkFilter, filterNetworks } from "@/utils/network";
import type { Rpc } from "./abstract";

class MultiRpc {
  readonly #rpcArray: Rpc[];

  constructor(rpcs: Rpc[] = []) {
    this.#rpcArray = rpcs;
  }

  getBalances<SA extends EVMCurvyAddress | StarknetCurvyAddress>(
    stealthAddress: SA,
  ): Promise<
    CurvyAddressBalances<
      SA extends EVMCurvyAddress
        ? NETWORK_FLAVOUR["EVM"]
        : SA extends StarknetCurvyAddress
          ? NETWORK_FLAVOUR["STARKNET"]
          : never
    >
  > {
    const rpcs = this.#rpcArray.filter((rpc) => rpc.network.flavour === stealthAddress.networkFlavour);
    return Promise.all(rpcs.map((rpc) => rpc.getBalances(stealthAddress))).then((results) => {
      return Object.assign(Object.create(null), ...results);
    });
  }

  Network(networkFilter: NetworkFilter): Rpc {
    const rpc = this.#rpcArray.filter((rpc) => {
      return filterNetworks([rpc.network], networkFilter).length;
    });

    if (rpc.length === 0) {
      throw new Error(`Expected exactly one, but no network found with filter ${networkFilter}`);
    }

    if (rpc.length > 1) {
      throw new Error(`Expected exactly one, but more than one network found with filter ${networkFilter}`);
    }

    return rpc[0];
  }
}

export { MultiRpc };

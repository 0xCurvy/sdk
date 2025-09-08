import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { CurvyAddress, RpcBalances } from "@/types";
import { toSlug } from "@/utils/helpers";
import { filterNetworks, type NetworkFilter } from "@/utils/network";
import type { Rpc } from "./abstract";

class MultiRpc {
  readonly #rpcArray: Rpc[];
  readonly #environment: NETWORK_ENVIRONMENT_VALUES;

  constructor(rpcs: Rpc[] = []) {
    this.#rpcArray = rpcs;
    this.#environment = rpcs[0].network.testnet ? "testnet" : "mainnet";

    const uniqueEnvSet = new Set(rpcs.map((rpc) => rpc.network.testnet));
    if (uniqueEnvSet.size > 1) {
      throw new Error("All RPCs must be either testnet or mainnet");
    }
  }

  getBalances(stealthAddress: CurvyAddress, networks: string[]): Promise<RpcBalances> {
    const rpcs = this.#rpcArray.filter(
      (rpc) =>
        rpc.network.flavour === stealthAddress.networkFlavour &&
        (networks.length === 0 || networks.includes(toSlug(rpc.network.name))),
    );
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

  get environment() {
    return this.#environment;
  }
}

export { MultiRpc };

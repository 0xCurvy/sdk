import { type NETWORK_ENVIRONMENT_VALUES, NETWORK_FLAVOUR } from "@/constants/networks";
import type { CurvyAddress, Erc1155Balance, Network, RpcBalances } from "@/types";
import { toSlug } from "@/utils/helpers";
import { filterNetworks, type NetworkFilter } from "@/utils/network";
import type { Rpc } from "./abstract";

class MultiRpc {
  readonly #rpcArray: Rpc[];
  readonly #environment: NETWORK_ENVIRONMENT_VALUES;

  constructor(rpcs: Rpc[] = []) {
    this.#rpcArray = rpcs;
    this.#environment = rpcs[0].network.testnet ? "testnet" : "mainnet";

    const uniqueEnvironmentSet = new Set(rpcs.map((rpc) => rpc.network.testnet));
    if (uniqueEnvironmentSet.size > 1) {
      throw new Error("All RPCs must be either testnet or mainnet");
    }
  }

  async getBalances(stealthAddress: CurvyAddress, networks: string[]): Promise<RpcBalances> {
    const rpcs = this.#rpcArray.filter(
      (rpc) =>
        rpc.network.flavour === stealthAddress.networkFlavour &&
        (networks.length === 0 || networks.includes(toSlug(rpc.network.name))),
    );
    return Promise.all(rpcs.map((rpc) => rpc.getBalances(stealthAddress))).then((results) => {
      return Object.assign(Object.create(null), ...results);
    });
  }

  async getErc1155Balances(curvyAddress: CurvyAddress): Promise<Erc1155Balance[]> {
    if (curvyAddress.networkFlavour !== NETWORK_FLAVOUR.EVM) return Promise.resolve([]);
    const rpcs = this.#rpcArray.filter(
      (rpc) => rpc.network.flavour === curvyAddress.networkFlavour && !!rpc.network.erc1155ContractAddress,
    );

    return Promise.all(rpcs.map((rpc) => rpc.getErc1155Balances(curvyAddress))).then((results) => {
      return results;
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

  async injectErc1155Ids(networks: Network[]): Promise<Network[]> {
    const injectedNetworks = [];

    for (const network of networks) {
      if (!network.erc1155ContractAddress) {
        injectedNetworks.push(network);
        continue;
      }

      const rpc = this.#rpcArray.find((rpc) => rpc.network.name === network.name);

      if (!rpc) {
        injectedNetworks.push(network);
        continue;
      }

      network.currencies = await rpc.injectErc1155Ids(network.currencies);
      injectedNetworks.push(network);
    }

    console.log(injectedNetworks);

    return injectedNetworks;
  }

  get environment() {
    return this.#environment;
  }
}

export { MultiRpc };

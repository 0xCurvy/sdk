import { normalize } from "viem/ens";
import { type NETWORK_ENVIRONMENT_VALUES, NETWORK_FLAVOUR } from "@/constants/networks";
import type { EvmRpc } from "@/rpc/evm";
import {
  type CurvyAddress,
  type CurvyHandle,
  type HexString,
  isHexString,
  type RpcBalances,
  type VaultBalance,
} from "@/types";
import type { AbortOptions } from "@/types/helper";
import { toSlug } from "@/utils/helpers";
import { filterNetworks, type NetworkFilter } from "@/utils/network";
import type { Rpc } from "./abstract";

class MultiRpc {
  readonly #rpcArray: Rpc[];

  constructor(rpcs: Rpc[] = []) {
    this.#rpcArray = rpcs;
  }

  async getBalances(
    stealthAddress: HexString | CurvyAddress,
    networks?: string[],
    { signal }: AbortOptions = {},
  ): Promise<RpcBalances> {
    const rpcs = this.#rpcArray.filter(
      (rpc) =>
        (isHexString(stealthAddress) || rpc.network.flavour === stealthAddress.networkFlavour) &&
        (!networks || networks.length === 0 || networks.includes(toSlug(rpc.network.name))),
    );
    return Promise.all(
      rpcs.map((rpc) => rpc.getBalances(isHexString(stealthAddress) ? stealthAddress : stealthAddress.address)),
    ).then((results) => {
      return Object.assign(Object.create(null), ...results);
    });
  }

  async getVaultBalances(curvyAddress: CurvyAddress): Promise<VaultBalance[]> {
    if (curvyAddress.networkFlavour !== NETWORK_FLAVOUR.EVM) return Promise.resolve([]);
    const rpcs = this.#rpcArray.filter(
      (rpc) => rpc.network.flavour === curvyAddress.networkFlavour && !!rpc.network.vaultContractAddress,
    );

    return Promise.all(rpcs.map((rpc) => rpc.getVaultBalances(curvyAddress.address))).then((results) => {
      return results;
    });
  }

  async ensResolveCurvyHandle(handle: CurvyHandle, environment: NETWORK_ENVIRONMENT_VALUES, slip0044?: bigint) {
    const publicClient = (this.Network(environment === "mainnet" ? "ethereum" : "ethereum-sepolia") as EvmRpc).provider;

    if (handle.includes(".local-curvy.name")) {
      throw new Error("Local Curvy handles are not supported for ENS resolution");
    }

    return publicClient.getEnsAddress({
      name: normalize(handle),
      coinType: slip0044,
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

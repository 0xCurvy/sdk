import { normalize } from "viem/ens";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { EvmRpc } from "@/rpc/evm";
import { SolanaRpc } from "@/rpc/solana";
import { type CurvyId, isHexString, type RpcBalances } from "@/types";
import type { AbortOptions } from "@/types/helper";
import type { CurvyPublicClient } from "@/utils";
import { toSlug } from "@/utils/helpers";
import { filterNetworks, type NetworkFilter } from "@/utils/network";
import type { Rpc } from "./abstract";

class MultiRpc {
  readonly #rpcArray: Rpc[];

  constructor(rpcs: Rpc[] = []) {
    this.#rpcArray = rpcs;
  }

  /**
   * Fetch balances for the given stealth address across one or more networks.
   *
   * The stealth address can be either EVM hex (`0x...`) or Solana base58 — we
   * route to the matching `Rpc` implementation per network. When no `networks`
   * filter is provided we infer compatible RPCs from the address format so a
   * caller passing a hex address never accidentally hits the Solana RPC (and
   * vice versa).
   */
  async getBalances(
    stealthAddress: string,
    networks?: string[],
    { signal: _ }: AbortOptions = {},
  ): Promise<RpcBalances> {
    const addressIsHex = isHexString(stealthAddress);
    const rpcs = this.#rpcArray.filter((rpc) => {
      // Each rpc only handles addresses native to its network flavour.
      const flavourMatches = rpc instanceof SolanaRpc ? !addressIsHex : addressIsHex;
      if (!flavourMatches) return false;
      // Optional explicit network filter (slugs).
      return !networks || networks.length === 0 || networks.includes(toSlug(rpc.network.name));
    });
    return Promise.all(rpcs.map((rpc) => rpc.getBalances(stealthAddress))).then((results) => {
      return Object.assign(Object.create(null), ...results);
    });
  }

  async ensResolveCurvyId(curvyId: CurvyId, environment: NETWORK_ENVIRONMENT_VALUES, slip0044?: bigint) {
    let publicClient: CurvyPublicClient;
    if (curvyId.includes(".local-curvy.name")) {
      publicClient = (this.Network("localnet") as EvmRpc).provider;
    } else {
      publicClient = (this.Network(environment === "mainnet" ? "ethereum" : "ethereum-sepolia") as EvmRpc).provider;
    }

    return publicClient.getEnsAddress({
      name: normalize(curvyId),
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

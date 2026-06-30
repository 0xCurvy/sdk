import { normalize } from "viem/ens";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { EvmRpc } from "@/rpc/evm";
import { SolanaRpc } from "@/rpc/solana";
import { type CurvyId, isHexString } from "@/types";
import type { AbortOptions } from "@/types/helper";
import { toSlug } from "@/utils/format";
import { filterNetworks, type NetworkFilter } from "@/utils/network";
import type { Rpc } from "./abstract";
import type { CurvyPublicClient, RpcBalances } from "./types";

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
  async getBalances(stealthAddress: string, networks?: string[], { signal }: AbortOptions = {}): Promise<RpcBalances> {
    signal?.throwIfAborted();
    const addressIsHex = isHexString(stealthAddress);
    const rpcs = this.#rpcArray.filter((rpc) => {
      // Each rpc only handles addresses native to its network flavour.
      const flavourMatches = rpc instanceof SolanaRpc ? !addressIsHex : addressIsHex;
      if (!flavourMatches) return false;
      // Optional explicit network filter (slugs).
      return !networks || networks.length === 0 || networks.includes(toSlug(rpc.network.name));
    });

    // allSettled (not all): one unreachable chain must not blank out balances for
    // every other network. Merge the chains that succeeded and surface the rest.
    const settled = await Promise.allSettled(rpcs.map((rpc) => rpc.getBalances(stealthAddress, { signal })));
    const merged: RpcBalances = Object.create(null);
    settled.forEach((result, i) => {
      if (result.status === "fulfilled") {
        Object.assign(merged, result.value);
      } else {
        console.warn(`MultiRpc.getBalances: ${toSlug(rpcs[i].network.name)} failed:`, result.reason);
      }
    });
    return merged;
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

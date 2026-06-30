import type { Chain, Transport } from "viem";
import { NETWORK_FLAVOUR } from "@/constants/networks";
import type { Network } from "@/types/api";
import { toViemChain } from "./toViemChain";

/** Identify a wanted network by slug, numeric chainId, or chainId string. */
export type WantedChain = string | number;

export type BuildWagmiNetworkConfigOptions = {
  /**
   * Which networks to include, by slug or chainId. Order is preserved (the first is wagmi's
   * default chain). Each must resolve to an EVM network present in `networks`.
   */
  chains: WantedChain[];
  /**
   * REQUIRED transport for each selected chain. Receives the source `Network` and its derived
   * viem `Chain`; return a viem `Transport` (e.g. `http(myProxyUrl)`). This is where you point
   * at your own RPC proxy instead of the chain's public RPC.
   */
  transport: (network: Network, chain: Chain) => Transport;
};

/**
 * Build the `{ chains, transports }` pair wagmi's `createConfig` expects, derived from Curvy
 * `Network` metadata — so chain DEFINITIONS live in one place (`toViemChain`) instead of a
 * hand-maintained `viem/chains` import list duplicated in the app. You select the chains you
 * want and supply the transports; the shape drops straight into `createConfig({ chains, transports })`.
 *
 * @example
 * const { chains, transports } = buildWagmiNetworkConfig(networks, {
 *   chains: ["ethereum", "arbitrum", "base"],
 *   transport: (n) => http(`${BACKEND_URL}/rpc/${n.slug}`),
 * });
 * const config = createConfig({ chains, transports, connectors });
 */
export function buildWagmiNetworkConfig(
  networks: Network[],
  options: BuildWagmiNetworkConfigOptions,
): { chains: readonly [Chain, ...Chain[]]; transports: Record<number, Transport> } {
  const resolve = (want: WantedChain): Network => {
    const match = networks.find(
      (n) => n.slug === want || n.chainId === String(want) || Number(n.chainId) === Number(want),
    );
    if (!match) throw new Error(`buildWagmiNetworkConfig: no network matching "${want}"`);
    if (match.flavour !== NETWORK_FLAVOUR.EVM) {
      throw new Error(`buildWagmiNetworkConfig: "${want}" is not an EVM network (wagmi/viem chains are EVM-only)`);
    }
    return match;
  };

  const selected = options.chains.map(resolve);
  if (selected.length === 0) {
    throw new Error("buildWagmiNetworkConfig: `chains` must select at least one network");
  }

  const chains = selected.map((n) => toViemChain(n));
  const transports: Record<number, Transport> = {};
  selected.forEach((n, i) => {
    transports[chains[i].id] = options.transport(n, chains[i]);
  });

  return { chains: chains as [Chain, ...Chain[]], transports };
}

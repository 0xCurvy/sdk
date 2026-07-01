import type { Chain, Transport } from "viem";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NETWORK_FLAVOUR } from "@/constants/networks";
import type { Network } from "@/types/api";
import { toViemChain } from "./toViemChain";

/** Identify a wanted network by slug, numeric chainId, or chainId string. */
export type WantedChain = string | number;

export type BuildWagmiNetworkConfigParameters = WithConfig<{
  /**
   * Which chains to include, by slug or chainId. Order is preserved (the first is wagmi's
   * default chain). Requested chains the resolved config doesn't serve as an EVM network are
   * skipped (with a warning) — so you can pass your full supported set regardless of environment.
   */
  chains: WantedChain[];
  /**
   * Transport for each selected chain. Receives the source `Network` and its derived viem `Chain`;
   * return a viem `Transport` (e.g. `http(myProxyUrl)`) — this is where you point at your RPC proxy.
   */
  transport: (network: Network, chain: Chain) => Transport;
}>;

/**
 * Build the `{ chains, transports }` pair wagmi's `createConfig` expects, from the ACTIVE Curvy
 * config's networks (ambient by default via {@link resolveConfig}; pass `config` to override).
 * Chain definitions come from {@link toViemChain}, so there's no hand-maintained `viem/chains`
 * import list — you pick the chains and supply the transports.
 *
 * @example
 * const { chains, transports } = buildWagmiNetworkConfig({
 *   chains: ["ethereum", "arbitrum", "base"],
 *   transport: (n) => http(`${BACKEND_URL}/rpc/${n.slug}`),
 * });
 * const wagmi = createConfig({ chains, transports, connectors });
 */
export function buildWagmiNetworkConfig(parameters: BuildWagmiNetworkConfigParameters): {
  chains: readonly [Chain, ...Chain[]];
  transports: Record<number, Transport>;
} {
  const { networks } = resolveConfig(parameters.config).state;

  const selected: Network[] = [];
  const skipped: WantedChain[] = [];
  for (const want of parameters.chains) {
    const match = networks.find(
      (n) => n.slug === want || n.chainId === String(want) || Number(n.chainId) === Number(want),
    );
    if (match && match.flavour === NETWORK_FLAVOUR.EVM) selected.push(match);
    else skipped.push(want);
  }
  if (skipped.length > 0) {
    console.warn(`buildWagmiNetworkConfig: skipped chain(s) not served as EVM networks: ${skipped.join(", ")}`);
  }
  if (selected.length === 0) {
    throw new Error("buildWagmiNetworkConfig: none of the requested chains are available as EVM networks");
  }

  const chains = selected.map((n) => toViemChain(n));
  const transports: Record<number, Transport> = {};
  selected.forEach((n, i) => {
    transports[chains[i].id] = parameters.transport(n, chains[i]);
  });

  return { chains: chains as [Chain, ...Chain[]], transports };
}

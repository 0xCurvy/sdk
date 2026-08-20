import type { Network, ProvingConfig } from "@/http/contracts";
import { resolveConfig } from "./global";
import type { WithConfig } from "./types";

/**
 * The proving parameters of ONE aggregator deployment, from the active config's state
 * (ambient by default; pass `config` to override). Loaded ONCE by `createCurvyConfig`
 * from `GET /protocol`. Throws if it isn't loaded yet — proving/fee ops can't proceed
 * without it.
 *
 * Each aggregator may run its own circuit dimensions (a cheap L2 can afford a 10-input
 * aggregation circuit, an L1 wants 2), so the circuit a proof is built against depends
 * on which network it will be submitted to — always pass the spend's `network`.
 *
 * Resolution order:
 *  1. `provingByChainId[network.chainId]` — that deployment's own circuits;
 *  2. `proving` — the DEFAULT aggregator's, which is also the whole response when
 *     talking to a metadata deployment that predates per-network circuits (older
 *     backend, newer SDK).
 *
 * Omitting `network` yields the default aggregator's config.
 *
 * The fee collector is NOT returned here: it is protocol-global (one collector identity
 * shared by every aggregator) and lives at `config.state.protocol.feeCollector`.
 */
export function getProtocol(parameters: WithConfig & { network?: Network } = {}): ProvingConfig {
  const protocol = resolveConfig(parameters.config).state.protocol;
  if (!protocol) {
    throw new Error("Curvy protocol config is not loaded — createCurvyConfig() must complete before proving/fee ops.");
  }
  const chainId = parameters.network?.chainId;
  if (chainId === undefined) return protocol.proving;
  return protocol.provingByChainId?.[String(chainId)] ?? protocol.proving;
}

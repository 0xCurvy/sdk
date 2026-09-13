import type { Network } from "@/http/contracts";
import { acceptsPortalShield } from "./acceptsPortalShield";
import { getActiveNetworks } from "./getActiveNetworks";
import type { WithConfig } from "./types";

/**
 * The active aggregator network that funds are shielded on when they land somewhere
 * without an aggregator of its own — the one flagged `defaultAggregator` for the
 * current (testnet or mainnet) environment.
 *
 * Prefer this over `getActiveNetworks().find(n => !!n.aggregatorContractAddress)`:
 * with several aggregators live, that picks whichever the registry happened to list
 * first. The same `find` is kept as a fallback so a backend that has not flagged a
 * default yet behaves exactly as before.
 *
 * Returns `undefined` when the current environment has no aggregator network at all.
 *
 * @example
 * const shielding = getDefaultAggregatorNetwork();
 */
export function getDefaultAggregatorNetwork(parameters: WithConfig = {}): Network | undefined {
  const candidates = getActiveNetworks(parameters).filter(acceptsPortalShield);
  return candidates.find((n) => n.defaultAggregator) ?? candidates[0];
}

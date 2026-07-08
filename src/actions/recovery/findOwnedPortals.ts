import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NETWORK_FLAVOUR } from "@/constants/networks";
import type { MatchedPortalRecord, Network } from "@/types/api";
import { findOwnedEvmPortals } from "./internal/findOwnedEvmPortals";

export type FindOwnedPortalsParameters = WithConfig<{
  network: Network;
}>;

/**
 * Enumerate every portal owned by the active account's keys on the given network.
 *
 * Used by /recover to surface
 * both entry and exit portals from a single toolkit (the user only has the
 * keys; the actual portal addresses are recovered by scanning the global
 * portal table and re-deriving from each candidate's stored ephemeral).
 * Solana support is entry-only and TODO — Solana exits don't exist yet, so
 * the Solana branch returns `[]`.
 *
 * @example
 * await findOwnedPortals({ network });
 */
export async function findOwnedPortals(parameters: FindOwnedPortalsParameters): Promise<MatchedPortalRecord[]> {
  const config = resolveConfig(parameters.config);
  const { network } = parameters;

  if (network.flavour === NETWORK_FLAVOUR.SOLANA) {
    // Solana has one entry portal per (keys, network) and no exit portals;
    // enumeration needs an address we don't have here, so return [] for now.
    return [];
  }
  return findOwnedEvmPortals(config, network);
}

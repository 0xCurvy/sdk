import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NETWORK_FLAVOUR } from "@/constants/networks";
import type { MatchedPortalRecord, Network } from "@/http/contracts";
import { findOwnedEvmPortals } from "./internal/findOwnedEvmPortals";

export type FindOwnedPortalsParameters = WithConfig<{
  network: Network;
}>;

/**
 * Enumerate every portal owned by the active account's keys on the given network.
 *
 * EVM portals are discovered from public portal records and verified against
 * the active account's keys. Solana portal enumeration is not supported and
 * returns an empty array.
 *
 * @example
 * await findOwnedPortals({ network });
 */
export async function findOwnedPortals(parameters: FindOwnedPortalsParameters): Promise<MatchedPortalRecord[]> {
  const config = resolveConfig(parameters.config);
  const { network } = parameters;

  if (network.flavour === NETWORK_FLAVOUR.SOLANA) {
    // Solana portals must be queried by address; this action has no address input.
    return [];
  }
  return findOwnedEvmPortals(config, network);
}

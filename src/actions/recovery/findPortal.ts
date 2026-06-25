import { getAddress } from "viem";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NETWORK_FLAVOUR } from "@/constants/networks";
import type { MatchedPortalRecord, Network } from "@/types/api";
import { type HexString, isHexString } from "@/types/helper";
import { findOwnedEvmPortals } from "./internal/findOwnedEvmPortals";
import { findSolanaPortal } from "./internal/findSolanaPortal";

export type FindPortalParameters = WithConfig<{
  address: HexString | (string & {});
  network: Network;
}>;

/**
 * Find the portal owned by the active account at a specific on-chain address.
 *
 * Dispatches by network flavour:
 * Solana matches a vault PDA directly; EVM enumerates every owned portal and
 * matches the checksummed target address.
 *
 * @example
 * await findPortal({ address: "0x…", network });
 */
export async function findPortal(parameters: FindPortalParameters): Promise<MatchedPortalRecord | null> {
  const config = resolveConfig(parameters.config);
  const { address, network } = parameters;

  if (network.flavour === NETWORK_FLAVOUR.SOLANA) {
    return findSolanaPortal(config, address, network);
  }
  if (!isHexString(address)) {
    throw new Error(`EVM recovery requires a hex address; got "${address}".`);
  }
  const owned = await findOwnedEvmPortals(config, network);
  const checksummedTarget = getAddress(address, +network.chainId);
  return owned.find((p) => getAddress(p.contractAddress as HexString, +network.chainId) === checksummedTarget) ?? null;
}

import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { PortalStatusResponse } from "@/types/api";

export type GetPortalStatusParameters = WithConfig<{
  /** Portal address (EVM hex or Solana base58) to look up. */
  address: string;
}>;

/**
 * Fetch the lifecycle status of a single portal by address. Delegates to the
 * backend, which returns `null` when no portal matches (404).
 *
 * @example
 * const status = await getPortalStatus({ address: "0x..." });
 */
export async function getPortalStatus(parameters: GetPortalStatusParameters): Promise<PortalStatusResponse | null> {
  const config = resolveConfig(parameters.config);
  return config.api.portal.getPortalStatus(parameters.address);
}

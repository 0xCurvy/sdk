import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import type { InsertExitPortalRequestBody } from "@/types/api";
import type { HexString } from "@/types/helper";

export type GenerateExitPortalParameters = WithConfig<InsertExitPortalRequestBody>;

/**
 * Generate (insert) an exit portal — the off-ramp that unshields funds out of
 * Curvy to a destination address. Delegates to the backend, which derives and
 * returns the portal `address` and its `flavour`.
 *
 * @example
 * const { address, flavour } = await generateExitPortal({
 *   curvyId: "alice.curvy.name",
 *   currencyId: 1,
 *   exitAddress: "0x...",
 * });
 */
export async function generateExitPortal(
  parameters: GenerateExitPortalParameters,
): Promise<{ address: HexString; flavour: NETWORK_FLAVOUR_VALUES }> {
  const config = resolveConfig(parameters.config);
  const { config: _config, ...body } = parameters;
  return config.api.portal.InsertExitPortal(body as InsertExitPortalRequestBody);
}

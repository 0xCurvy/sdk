import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import type { InsertEntryPortalRequestBody } from "@/types/api";
import type { HexString } from "@/types/helper";

export type GenerateEntryPortalParameters = WithConfig<InsertEntryPortalRequestBody>;

/**
 * Generate (insert) an entry portal — the on-ramp address that shields funds
 * into Curvy. Delegates to the backend, which derives and returns the portal
 * `address` and its `flavour`.
 *
 * @example
 * const { address, flavour } = await generateEntryPortal({ curvyId: "alice.curvy.name" });
 */
export async function generateEntryPortal(
  parameters: GenerateEntryPortalParameters,
): Promise<{ address: HexString; flavour: NETWORK_FLAVOUR_VALUES }> {
  const config = resolveConfig(parameters.config);
  const { config: _config, ...body } = parameters;
  return config.api.portal.insertEntryPortal(body as InsertEntryPortalRequestBody);
}

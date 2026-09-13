import type { Network } from "@/http/contracts";

/**
 * Whether portals may be shielded on `network`.
 *
 * Carrying an `aggregatorContractAddress` is NOT enough: a direct-shield-only
 * deployment (Gnosis) left its on-chain `portalFactory` at address(0), and
 * `portalShield` starts by asking that factory whether the caller is a registered
 * portal — so every portal shield there reverts. Metadata flags such a network
 * `portalShieldEnabled: false`; the portal-broadcaster applies the same predicate,
 * so anything modelling the deposit pipeline (shielding target, entry bridge,
 * fee estimates) must use this rather than the bare address.
 *
 * `directShield` is unaffected — the SDK keeps shielding into such an aggregator
 * from a wallet the user controls.
 *
 * Absent (metadata predating the field) means portal-capable, as before.
 */
export function acceptsPortalShield(network: Network): boolean {
  return !!network.aggregatorContractAddress && network.portalShieldEnabled !== false;
}

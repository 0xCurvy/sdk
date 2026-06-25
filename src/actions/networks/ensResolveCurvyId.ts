import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyId } from "@/types/curvy";
import type { HexString } from "@/types/helper";

export type EnsResolveCurvyIdParameters = WithConfig<{
  /** The Curvy handle to resolve via ENS. */
  handle: CurvyId;
  /** Optional SLIP-0044 coin type to resolve a chain-specific address. */
  slip0044?: bigint;
}>;

/**
 * Resolve a Curvy handle to an on-chain address via ENS for the active environment.
 *
 * @example
 * const address = await ensResolveCurvyId({ handle: "alice.curvy.name" });
 *
 * @throws when the handle cannot be resolved.
 */
export async function ensResolveCurvyId(parameters: EnsResolveCurvyIdParameters): Promise<HexString> {
  const config = resolveConfig(parameters.config);
  const { handle, slip0044 } = parameters;

  const address = await config.getRpc().ensResolveCurvyId(handle, config.state.environment, slip0044);

  if (!address) {
    throw new Error(`Handle ${handle} not found via ENS`);
  }

  return address;
}

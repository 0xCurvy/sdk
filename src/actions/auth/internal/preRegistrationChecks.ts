import type { CurvyConfig } from "@/config/types";
import { CURVY_ID_REGEX } from "@/constants/regex";
import type { CurvyId, HexString } from "@/types";

/**
 * Guard handle registration: the owner address must be unregistered, the handle
 * must be well-formed, and it must not already exist.
 *
 * Internal (non-action) helper: `config` is a plain first arg.
 */
export async function preRegistrationChecks(
  config: CurvyConfig,
  handle: CurvyId,
  userAddress: HexString,
): Promise<true> {
  const curvyHandle = await config.api.user.GetCurvyIdByOwnerAddress(userAddress);
  if (curvyHandle) {
    throw new Error(`Handle ${curvyHandle} already registered, for owner address: ${userAddress}`);
  }

  if (!CURVY_ID_REGEX.test(handle))
    throw new Error(
      `Invalid handle format: ${handle}. Curvy handles can only include letters, numbers, and dashes, with a minimum of 3 and maximum length of 20 characters.`,
    );

  const { data: userDetails } = await config.api.user.ResolveCurvyId(handle);
  if (userDetails) throw new Error(`Handle ${handle} already registered.`);

  return true;
}

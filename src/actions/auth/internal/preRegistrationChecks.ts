import type { CurvyConfig } from "@/config/types";
import { CURVY_ID_REGEX } from "@/constants/regex";
import { AuthError } from "@/errors";
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
    throw new AuthError(`Handle ${curvyHandle} already registered, for owner address: ${userAddress}`);
  }

  if (!CURVY_ID_REGEX.test(handle))
    throw new AuthError(
      `Invalid handle format: ${handle}. Curvy handles can only include letters, numbers, and dashes, with a minimum of 3 and maximum length of 20 characters.`,
    );

  const { data: userDetails } = await config.api.user.ResolveCurvyId(handle);
  if (userDetails) throw new AuthError(`Handle ${handle} already registered.`);

  return true;
}

import type { CurvyConfig } from "@/config/types";
import { AuthError } from "@/errors";
import { assertCurvyId, type HexString } from "@/types";

/**
 * Resolve a user's on-chain details from their owner address.
 *
 * Internal (non-action) helper: `config` is a plain first arg. Throws if no
 * Curvy handle is registered for the address, or the handle fails to resolve.
 *
 * @example
 * const { createdAt, publicKeys, curvyHandle } = await getUserDetails(config, userAddress);
 */
export async function getUserDetails(config: CurvyConfig, userAddress: HexString) {
  const curvyHandle = await config.api.user.GetCurvyIdByOwnerAddress(userAddress);
  if (!curvyHandle) {
    throw new AuthError(`No Curvy handle found for address: ${userAddress}`);
  }

  assertCurvyId(curvyHandle);

  const { data: userDetails } = await config.api.user.ResolveCurvyId(curvyHandle);
  if (!userDetails) throw new AuthError(`Handle ${curvyHandle} does not exist.`);

  return { ...userDetails, curvyHandle };
}

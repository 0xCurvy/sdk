import type { CurvyConfig } from "@/config/types";
import { AuthError } from "@/errors";
import type { CurvyKeyPairs, HexString } from "@/types";
import { requireSpendKey } from "@/utils/keys";
import { getUserDetails } from "./getUserDetails";
import { updateBearerToken } from "./session";

/**
 * Validate that derived keypairs match the server's record for an owner
 * address, then authenticate.
 *
 * Internal (non-action) helper: `config` is a plain first arg. Throws on a key
 * mismatch ("Wrong password"). Returns `{ createdAt, curvyHandle }`.
 */
export async function preLoginChecks(config: CurvyConfig, keyPairs: CurvyKeyPairs, userAddress: HexString) {
  const { createdAt, publicKeys, curvyHandle } = await getUserDetails(config, userAddress);

  if (!(publicKeys.viewingKey === keyPairs.V && publicKeys.spendingKey === keyPairs.S)) {
    throw new AuthError(`Wrong password for handle ${curvyHandle}.`);
  }

  await updateBearerToken(config, requireSpendKey(keyPairs));

  return { createdAt, curvyHandle };
}

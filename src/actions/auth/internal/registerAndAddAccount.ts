import type { CurvyAccount } from "@/account";
import type { CurvyConfig } from "@/config/types";
import type { AdditionalAccountData, CurvyId, CurvyPrivateKeys, HexString } from "@/types";
import { requireSpendKey } from "@/utils/keys";
import { createAndAddAccount } from "./createAndAddAccount";
import { updateBearerToken } from "./session";

/**
 * Register a new Curvy handle on the server, validate it resolved, authenticate,
 * and create/add the account.
 *
 * Internal (non-action) helper: `config` is a plain first arg.
 */
export async function registerAndAddAccount(
  config: CurvyConfig,
  { s, v }: CurvyPrivateKeys,
  handle: CurvyId,
  userAddress: HexString,
  additionalData?: AdditionalAccountData,
): Promise<CurvyAccount> {
  const keyPairs = await config.core.getCurvyKeys(s, v);

  await config.api.user.RegisterCurvyId({
    handle,
    ownerAddress: userAddress,
    publicKeys: {
      viewingKey: keyPairs.V,
      spendingKey: keyPairs.S,
      babyJubjubPublicKey: keyPairs.babyJubjubPublicKey,
    },
  });

  const { data: registerDetails } = await config.api.user.ResolveCurvyId(handle);
  if (!registerDetails)
    throw new Error(`Registration validation failed for handle ${handle}. Please try adding the account manually.`);

  await updateBearerToken(config, requireSpendKey(keyPairs));

  return createAndAddAccount(config, handle, userAddress, registerDetails.createdAt, keyPairs, additionalData);
}

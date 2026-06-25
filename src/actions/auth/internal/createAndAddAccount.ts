import dayjs from "dayjs";
import { CurvyAccount } from "@/account";
import { addAccount } from "@/actions";
import type { CurvyConfig } from "@/config/types";
import type { AdditionalAccountData, CurvyId, CurvyKeyPairs, HexString } from "@/types";
import { computePasswordHash } from "@/utils/encryption";
import { generateAccountId } from "@/utils/keys";

/**
 * Build a full `CurvyAccount` from resolved keypairs/handle and register it.
 *
 * Internal (non-action) helper: `config` is a plain first arg. Adds the account
 * with `skipBearerTokenUpdate = true` (the caller already authenticated via the
 * pre-login/registration checks).
 */
export async function createAndAddAccount(
  config: CurvyConfig,
  handle: CurvyId,
  userAddress: HexString,
  createdAt: string,
  keyPairs: CurvyKeyPairs,
  additionalData?: AdditionalAccountData,
): Promise<CurvyAccount> {
  const accountId = await generateAccountId(keyPairs.s, keyPairs.v);
  const account = new CurvyAccount(
    keyPairs,
    handle,
    userAddress,
    +dayjs(createdAt),
    additionalData?.password ? await computePasswordHash(additionalData.password, accountId) : undefined,
    additionalData?.credId,
  );
  await addAccount({ config, account, skipBearerTokenUpdate: true });

  return account;
}

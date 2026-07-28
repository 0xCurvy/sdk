import type { CurvyAccount } from "@/account";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { computePrivateKeys } from "@/utils/keys";
import { type PasskeyPrfValue, processPasskeyPrf } from "@/utils/passkey/processPasskeyPrf";
import { createAndAddAccount } from "./internal/createAndAddAccount";
import { preLoginChecks } from "./internal/preLoginChecks";

export type LoginWithPasskeyParameters = WithConfig<{
  prfValue: PasskeyPrfValue;
  credId?: ArrayBuffer;
}>;

/**
 * Log in via a passkey PRF output.
 *
 * Derives a signature (and owner address) from the PRF value, computes the
 * private keys, runs the pre-login checks, then creates and adds the account.
 *
 * @example
 * const account = await loginWithPasskey({ prfValue, credId });
 */
export async function loginWithPasskey(parameters: LoginWithPasskeyParameters): Promise<CurvyAccount> {
  const config = resolveConfig(parameters.config);
  const { prfValue, credId } = parameters;

  const { prfAddress: userAddress, ...signature } = await processPasskeyPrf(prfValue);

  const { s, v } = computePrivateKeys(signature.r.toString(), signature.s.toString());
  const keyPairs = await config.core.getCurvyKeys(s, v);

  const { curvyHandle, createdAt } = await preLoginChecks(config, keyPairs, userAddress);

  return createAndAddAccount(config, curvyHandle, userAddress, createdAt, keyPairs, { credId });
}

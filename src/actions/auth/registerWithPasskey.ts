import type { CurvyAccount } from "@/account";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyId } from "@/types";
import { computePrivateKeys } from "@/utils/keys";
import { type PasskeyPrfValue, processPasskeyPrf } from "@/utils/passkey/processPasskeyPrf";
import { preRegistrationChecks } from "./internal/preRegistrationChecks";
import { registerAndAddAccount } from "./internal/registerAndAddAccount";

export type RegisterWithPasskeyParameters = WithConfig<{
  handle: CurvyId;
  prfValue: PasskeyPrfValue;
  credId?: ArrayBuffer;
}>;

/**
 * Register a new Curvy handle via a passkey PRF output.
 *
 * @example
 * const account = await registerWithPasskey({ handle, prfValue, credId });
 */
export async function registerWithPasskey(parameters: RegisterWithPasskeyParameters): Promise<CurvyAccount> {
  const config = resolveConfig(parameters.config);
  const { handle, prfValue, credId } = parameters;

  const { prfAddress: userAddress, ...signature } = await processPasskeyPrf(prfValue);

  await preRegistrationChecks(config, handle, userAddress);

  const { s, v } = computePrivateKeys(signature.r.toString(), signature.s.toString());

  return registerAndAddAccount(config, { s, v }, handle, userAddress, { credId });
}

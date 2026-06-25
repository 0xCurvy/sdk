import type { CurvyAccount } from "@/account";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyId, EvmSignatureData } from "@/types";
import { computePrivateKeys } from "@/utils/keys";
import { preRegistrationChecks } from "./internal/preRegistrationChecks";
import { registerAndAddAccount } from "./internal/registerAndAddAccount";
import { verifyEvmSignature } from "./internal/verifyEvmSignature";

export type RegisterParameters = WithConfig<{ handle: CurvyId; signature: EvmSignatureData }>;

/**
 * Register a new Curvy handle from a account signature.
 *
 * Runs the pre-registration checks, verifies the signature, derives the private
 * keys, then registers and adds the account.
 *
 * @example
 * const account = await register({ handle, signature });
 */
export async function register(parameters: RegisterParameters): Promise<CurvyAccount> {
  const config = resolveConfig(parameters.config);
  const { handle, signature } = parameters;

  const userAddress = signature.signingAddress;

  await preRegistrationChecks(config, handle, userAddress);

  const [r_string, s_string] = await verifyEvmSignature(signature);
  const { s, v } = computePrivateKeys(r_string, s_string);

  return registerAndAddAccount(config, { s, v }, handle, userAddress);
}

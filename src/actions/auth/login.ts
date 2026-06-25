import type { CurvyAccount } from "@/account";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { EvmSignatureData, StarknetSignatureData } from "@/types";
import { computePrivateKeys } from "@/utils/keys";
import { createAndAddAccount } from "./internal/createAndAddAccount";
import { preLoginChecks } from "./internal/preLoginChecks";
import { verifyEvmSignature } from "./internal/verifyEvmSignature";

export type LoginParameters = WithConfig<{ signature: EvmSignatureData | StarknetSignatureData }>;

/**
 * Log in (add an existing account) from a account signature.
 *
 * Verifies the signature, derives the spending/viewing private keys, fetches
 * the Curvy keypairs, runs the pre-login checks (which authenticate), then
 * creates and registers the account.
 *
 * @example
 * const account = await login({ signature });
 */
export async function login(parameters: LoginParameters): Promise<CurvyAccount> {
  const config = resolveConfig(parameters.config);
  const { signature } = parameters;

  const [r_string, s_string] = await verifyEvmSignature(signature);
  const { s, v } = computePrivateKeys(r_string, s_string);
  const keyPairs = await config.core.getCurvyKeys(s, v);

  const userAddress = signature.signingAddress;

  const { createdAt, curvyHandle } = await preLoginChecks(config, keyPairs, userAddress);

  return createAndAddAccount(config, curvyHandle, userAddress, createdAt, keyPairs);
}

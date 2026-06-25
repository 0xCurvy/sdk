import type { CurvyAccount } from "@/account";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { HexString } from "@/types";
import { createAndAddAccount } from "./internal/createAndAddAccount";
import { preLoginChecks } from "./internal/preLoginChecks";

export type LoginWithPrivateKeysParameters = WithConfig<{
  s: string;
  v: string;
  requestingAddress: HexString;
  credId?: ArrayBuffer;
}>;

/**
 * Log in from raw spending/viewing private keys.
 *
 * @example
 * const account = await loginWithPrivateKeys({ s, v, requestingAddress });
 */
export async function loginWithPrivateKeys(parameters: LoginWithPrivateKeysParameters): Promise<CurvyAccount> {
  const config = resolveConfig(parameters.config);
  const { s, v, requestingAddress, credId } = parameters;

  const keyPairs = await config.core.getCurvyKeys(s, v);

  const { curvyHandle, createdAt } = await preLoginChecks(config, keyPairs, requestingAddress);

  return createAndAddAccount(config, curvyHandle, requestingAddress, createdAt, keyPairs, { credId });
}

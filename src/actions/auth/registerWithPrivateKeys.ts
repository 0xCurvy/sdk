import type { CurvyAccount } from "@/account";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyId, HexString } from "@/types";
import { preRegistrationChecks } from "./internal/preRegistrationChecks";
import { registerAndAddAccount } from "./internal/registerAndAddAccount";

export type RegisterWithPrivateKeysParameters = WithConfig<{
  s: string;
  v: string;
  handle: CurvyId;
  userAddress: HexString;
}>;

/**
 * Register a new Curvy handle from raw spending/viewing private keys. Faithful
 * port of `AccountManager.registerAccountWithPrivateKeys`.
 *
 * @example
 * const account = await registerWithPrivateKeys({ s, v, handle, userAddress });
 */
export async function registerWithPrivateKeys(parameters: RegisterWithPrivateKeysParameters): Promise<CurvyAccount> {
  const config = resolveConfig(parameters.config);
  const { s, v, handle, userAddress } = parameters;

  await preRegistrationChecks(config, handle, userAddress);

  return registerAndAddAccount(config, { s, v }, handle, userAddress);
}

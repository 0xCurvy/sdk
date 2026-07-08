import { CurvyAccount } from "@/account";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyKeyPairs } from "@/types/core";
import { addAccount } from "./addAccount";

export type AddPartialAccountParameters = WithConfig<{
  keyPairs: Partial<CurvyKeyPairs>;
}>;

/**
 * Add a partial (handle-less, owner-less) account built from a subset of
 * keypairs and make it active.
 *
 * Partial accounts carry no handle/owner, so they are never serialized to
 * `state.accounts`, written to storage, or persisted to the keystore; the bearer
 * token is left untouched (`skipBearerTokenUpdate`).
 *
 * @example
 * const account = await addPartialAccount({ keyPairs: { s, v } });
 */
export async function addPartialAccount(parameters: AddPartialAccountParameters): Promise<CurvyAccount> {
  const config = resolveConfig(parameters.config);

  const account = new CurvyAccount({ keyPairs: parameters.keyPairs, curvyHandle: null, ownerAddress: null });
  await addAccount({ config, account, skipBearerTokenUpdate: true });

  return account;
}

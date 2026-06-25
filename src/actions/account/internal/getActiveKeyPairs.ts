import type { CurvyConfig } from "@/config/types";
import { NoActiveAccountError } from "@/errors";
import type { CurvyKeyPairs } from "@/types/core";

/**
 * Resolve an account's keypairs from `config.keyring` — by explicit `accountId`,
 * otherwise the active account (`state.activeAccountId`).
 *
 * Internal (non-action) helper: takes `config` as a plain first arg. Keys live
 * only in the keyring, never in `state`. Throws `NoActiveAccountError` when
 * neither id resolves to a keyring entry.
 *
 * @example
 * const keyPairs = getActiveKeyPairs(config);            // active account
 * const keyPairs = getActiveKeyPairs(config, accountId); // explicit account
 */
export function getActiveKeyPairs(config: CurvyConfig, accountId?: string): CurvyKeyPairs {
  const id = accountId ?? config.state.activeAccountId;
  const keyPairs = id ? config.keyring.get(id) : undefined;
  if (!keyPairs) throw new NoActiveAccountError();
  return keyPairs;
}

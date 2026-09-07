import { getActiveAccountId } from "@/actions";
import type { CurvyConfig } from "@/config/types";
import type { CurvyKeyPairs } from "@/core/types";
import { NoActiveAccountError } from "@/errors";

/** Resolve runtime identity and keys without requiring registered profile metadata. */
export function resolveAccount(config: CurvyConfig, accountId?: string): { id: string; keyPairs: CurvyKeyPairs } {
  const id = accountId ?? getActiveAccountId({ config });
  const keyPairs = id ? config.keyring.get(id) : undefined;
  if (!id || !keyPairs) throw new NoActiveAccountError();
  return { id, keyPairs };
}

import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { requireSpendKey } from "@/utils/keys";
import { getActiveKeyPairs } from "./internal/getActiveKeyPairs";

export type GetBabyJubjubPublicKeyParameters = WithConfig<{ accountId?: string }>;

/**
 * Derive the BabyJubjub public key for an account's spending key. Resolves the
 * active (or explicit) live account and delegates to `core.getBabyJubjubPublicKey`.
 *
 * @example
 * const bjjPubKey = await getBabyJubjubPublicKey();
 */
export function getBabyJubjubPublicKey(parameters: GetBabyJubjubPublicKeyParameters = {}): Promise<string> {
  const config = resolveConfig(parameters.config);
  const keyPairs = getActiveKeyPairs(config, parameters.accountId);
  return config.core.getBabyJubjubPublicKey(requireSpendKey(keyPairs));
}

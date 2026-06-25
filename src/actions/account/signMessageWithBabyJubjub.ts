import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { Signature, StringifyBigInts } from "@/types";
import { requireSpendKey } from "@/utils/keys";
import { getActiveKeyPairs } from "./internal/getActiveKeyPairs";

export type SignMessageWithBabyJubjubParameters = WithConfig<{ message: bigint; accountId?: string }>;

/**
 * Sign a message with a account's BabyJubjub spending key. Resolves the active
 * (or explicit) live account and delegates to `core.signWithBabyJubjubPrivateKey`.
 *
 * @example
 * const signature = await signMessageWithBabyJubjub({ message: 42n });
 */
export function signMessageWithBabyJubjub(
  parameters: SignMessageWithBabyJubjubParameters,
): Promise<StringifyBigInts<Signature>> {
  const config = resolveConfig(parameters.config);
  const keyPairs = getActiveKeyPairs(config, parameters.accountId);
  return config.core.signWithBabyJubjubPrivateKey(parameters.message, requireSpendKey(keyPairs));
}

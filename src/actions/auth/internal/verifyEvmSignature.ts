import { parseSignature, verifyTypedData } from "viem";
import { type EvmSignatureData, type EvmSignTypedDataParameters, isHexString } from "@/types";

/**
 * Verify an EVM EIP-712 signature and return its `[r, s]` components. Faithful
 * port of `AccountManager.#verifySignature`.
 *
 * Internal (non-action) helper. Throws on a non-hex signature result or a
 * signature that fails typed-data verification against `signingAddress`.
 *
 * @example
 * const [r, s] = await verifyEvmSignature(signatureData);
 */
export async function verifyEvmSignature({
  signatureParams,
  signingAddress,
  signatureResult,
}: EvmSignatureData): Promise<[r: string, s: string]> {
  if (!isHexString(signatureResult)) {
    throw new Error("Invalid signature result");
  }

  const signature = parseSignature(signatureResult);

  const isValidSignature = await verifyTypedData({
    signature,
    address: signingAddress,
    ...(signatureParams as EvmSignTypedDataParameters),
  });

  if (!isValidSignature) {
    throw new Error("Signature verification failed. Invalid signature.");
  }

  return [signature.r, signature.s];
}

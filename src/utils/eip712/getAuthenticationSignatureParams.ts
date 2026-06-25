import { getAddress } from "viem";
import type { EvmSignTypedDataParameters } from "@/types";
import { getSignatureParams as evmGetSignatureParams } from "@/utils/eip712/getSignatureParams";
import { shaDigest } from "@/utils/hash";

/**
 * Builds the EIP-712 typed-data parameters used to authenticate a Curvy owner:
 * checksums the owner address, derives a SHA-512 digest of `address::password`,
 * and embeds it in a Curvy Protocol `AuthMessage`.
 *
 * The same `(ownerAddress, password)` pair always yields the same parameters;
 * the address is normalised to its EIP-55 checksum form before hashing.
 *
 * @example
 * const params = await getAuthenticationSignatureParams(
 *   "0x67fcb5316956053214374f37c53515ae3441b8ee",
 *   "hunter2",
 * );
 * params.primaryType; // "AuthMessage"
 */
async function getAuthenticationSignatureParams(
  ownerAddress: string,
  password: string,
): Promise<EvmSignTypedDataParameters> {
  const address = getAddress(ownerAddress);

  const preimage = `${address}::${password}`;
  const messageToSign = await shaDigest("SHA-512", preimage);

  return evmGetSignatureParams(messageToSign);
}

export { getAuthenticationSignatureParams };

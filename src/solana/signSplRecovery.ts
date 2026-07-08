import type { Address } from "@solana/kit";
import { RECOVERY_DOMAIN } from "@/constants/solana";
import { addressToBytes, hashRecoveryMessage, signDigest } from "./recoverySigning";

/**
 * Sign a recover_spl message. The SPL variant additionally binds the mint so
 * a signature for one token cannot be replayed for another.
 *
 * @example
 * const { signature, recoveryId } = await signSplRecovery({
 *   secpPrivKey, programAddress, ownerHash, recoveryIdentifier, recipient, mint,
 * });
 * // signature is 64 bytes (compact), recoveryId is 0..3
 */
export async function signSplRecovery(params: {
  secpPrivKey: string | Uint8Array;
  programAddress: Address;
  ownerHash: Uint8Array;
  recoveryIdentifier: Address;
  recipient: Address;
  mint: Address;
}): Promise<{ signature: Uint8Array; recoveryId: number }> {
  const digest = await hashRecoveryMessage([
    RECOVERY_DOMAIN,
    addressToBytes(params.programAddress),
    params.ownerHash,
    addressToBytes(params.recoveryIdentifier),
    addressToBytes(params.recipient),
    addressToBytes(params.mint),
    new TextEncoder().encode("SPL"),
  ]);
  return signDigest(params.secpPrivKey, digest);
}

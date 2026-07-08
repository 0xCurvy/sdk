import type { Address } from "@solana/kit";
import { RECOVERY_DOMAIN } from "@/constants/solana";
import { addressToBytes, hashRecoveryMessage, signDigest } from "./recoverySigning";

/**
 * Sign a recover_sol message. Matches `signSolRecovery` in
 * `packages/solana/scripts/devnet-helpers.ts` — produces the exact bytes the
 * on-chain `recover_sol` handler expects.
 *
 * @example
 * const { signature, recoveryId } = await signSolRecovery({
 *   secpPrivKey, programAddress, ownerHash, recoveryIdentifier, recipient,
 * });
 * // signature is 64 bytes (compact), recoveryId is 0..3
 */
export async function signSolRecovery(params: {
  secpPrivKey: string | Uint8Array;
  programAddress: Address;
  ownerHash: Uint8Array;
  recoveryIdentifier: Address;
  recipient: Address;
}): Promise<{ signature: Uint8Array; recoveryId: number }> {
  const digest = await hashRecoveryMessage([
    RECOVERY_DOMAIN,
    addressToBytes(params.programAddress),
    params.ownerHash,
    addressToBytes(params.recoveryIdentifier),
    addressToBytes(params.recipient),
    new TextEncoder().encode("SOL"),
  ]);
  return signDigest(params.secpPrivKey, digest);
}

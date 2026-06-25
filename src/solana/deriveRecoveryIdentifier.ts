import { getPublicKey } from "@noble/secp256k1";
import { type Address, getAddressDecoder } from "@solana/kit";
import { RECOVERY_DOMAIN } from "@/constants/solana";
import { ownerHashToBytes } from "./ownerHashToBytes";

/**
 * Recovery identifier — a 32-byte pseudo-pubkey derived from the recovery
 * secp256k1 key and a domain separator. It's used as one of the seeds for
 * the vault PDA, so the vault address is unique per recovery key.
 *
 * Returns a kit `Address` (branded base58 string), since the recovery
 * identifier is used wherever an Ed25519-style 32-byte account address is
 * required downstream (as a PDA seed).
 *
 * @example
 * const { recoveryIdentifier, compressedPubKey } = await deriveRecoveryIdentifier(secpPrivKey);
 * // recoveryIdentifier is a deterministic base58 Address; compressedPubKey is 33 bytes
 */
export async function deriveRecoveryIdentifier(secpPrivKey: string | Uint8Array): Promise<{
  recoveryIdentifier: Address;
  compressedPubKey: Uint8Array;
}> {
  const privKeyBytes = typeof secpPrivKey === "string" ? ownerHashToBytes(secpPrivKey) : secpPrivKey;
  const compressedPubKey = getPublicKey(privKeyBytes, true);

  const toHash = new Uint8Array(RECOVERY_DOMAIN.length + compressedPubKey.length);
  toHash.set(RECOVERY_DOMAIN, 0);
  toHash.set(compressedPubKey, RECOVERY_DOMAIN.length);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", toHash));

  // 32 raw bytes → base58 `Address` via the kit codec. The SHA-256 output
  // is not guaranteed to be on the Ed25519 curve, which is precisely what we
  // want: the recovery identifier must be unable to sign transactions.
  return {
    recoveryIdentifier: getAddressDecoder().decode(hash),
    compressedPubKey,
  };
}

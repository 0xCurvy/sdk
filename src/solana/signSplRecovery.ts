import { signAsync } from "@noble/secp256k1";
import { type Address, getAddressEncoder } from "@solana/kit";
import { RECOVERY_DOMAIN } from "@/constants/solana";
import { invariant } from "@/utils/invariant";
import { ownerHashToBytes } from "./ownerHashToBytes";

/**
 * Recover-message hasher — concatenates all the parts the on-chain program
 * hashes in `recovery::message_hash` and returns the 32-byte sha256 result.
 *
 * See `packages/solana/programs/curvy-portal/src/recovery.rs` — the signature
 * is verified over `sha256(RECOVERY_DOMAIN || programId || ownerHash ||
 * recoveryIdentifier || recipient || (mint)? || "SOL"|"SPL")`.
 */
async function hashRecoveryMessage(parts: Uint8Array[]): Promise<Uint8Array> {
  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    buf.set(p, offset);
    offset += p.length;
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
}

async function signDigest(
  secpPrivKey: string | Uint8Array,
  digest: Uint8Array,
): Promise<{ signature: Uint8Array; recoveryId: number }> {
  const privKeyBytes = typeof secpPrivKey === "string" ? ownerHashToBytes(secpPrivKey) : secpPrivKey;
  const sig = await signAsync(digest, privKeyBytes);
  invariant(sig.recovery !== undefined, "secp256k1 signature is missing a recovery id");
  return { signature: sig.toCompactRawBytes(), recoveryId: sig.recovery };
}

/**
 * Encode a kit `Address` as its raw 32-byte public-key bytes. Used for the
 * message-hash derivation where we need the on-the-wire account bytes, not
 * the base58 string.
 */
function addressToBytes(addr: Address): Uint8Array {
  return getAddressEncoder().encode(addr) as Uint8Array;
}

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

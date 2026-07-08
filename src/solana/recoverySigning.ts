import { signAsync } from "@noble/secp256k1";
import { type Address, getAddressEncoder } from "@solana/kit";
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
export async function hashRecoveryMessage(parts: Uint8Array[]): Promise<Uint8Array> {
  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    buf.set(p, offset);
    offset += p.length;
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
}

export async function signDigest(
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
export function addressToBytes(addr: Address): Uint8Array {
  return getAddressEncoder().encode(addr) as Uint8Array;
}

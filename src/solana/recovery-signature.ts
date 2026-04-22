import { signAsync } from "@noble/secp256k1";
import { type Address, getAddressEncoder } from "@solana/kit";
import { RECOVERY_DOMAIN } from "@/constants/solana";
import { ownerHashToBytes } from "./pda";

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
  if (sig.recovery === undefined) {
    throw new Error("secp256k1 signature is missing a recovery id");
  }
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
 * Sign a recover_sol message. Matches `signSolRecovery` in
 * `packages/solana/scripts/devnet-helpers.ts` — produces the exact bytes the
 * on-chain `recover_sol` handler expects.
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

/**
 * Sign a recover_spl message. The SPL variant additionally binds the mint so
 * a signature for one token cannot be replayed for another.
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

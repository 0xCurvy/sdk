import bs58 from "bs58";
import { Buffer } from "buffer";
import { sha256 } from "viem";

/**
 * Derive a Solana recovery pubkey (base58) from a SECP256k1 stealth public key.
 *
 * Because the EVM stealth address scheme runs on SECP256k1 and Solana uses Ed25519,
 * there is no way to go directly from a SECP256k1 public key to an Ed25519 signing key
 * without knowing the corresponding private key. Instead we derive a deterministic
 * 32-byte identifier via domain-separated SHA-256 of the compressed SECP256k1 point.
 *
 * This value is used as the `recovery` component in the vault PDA seeds:
 *   PDA = findProgramAddress(["portal", owner_hash, solana_recovery_pubkey], programId)
 *
 * Recovery authorization is proved on-chain via Solana's native secp256k1_recover
 * syscall — the user signs a recovery message with their SECP256k1 stealth private key.
 *
 * @param rawPubKey - SECP256k1 stealth public key in "X.Y" decimal-coordinate format
 *                   (output of wasm.send().spendingPubKey)
 * @returns base58-encoded 32-byte Solana Pubkey
 *
 * @example
 * deriveSolanaRecoveryPubkey("12345678901234567890.98765432109876543210");
 * // => deterministic base58 string, e.g. "9xQ...."
 */
const deriveSolanaRecoveryPubkey = (rawPubKey: string): string => {
  if (!rawPubKey) throw new Error("Missing public key for Solana address derivation");

  const [X, Y] = rawPubKey.split(".");
  if (!X || !Y) throw new Error("Invalid public key format for Solana derivation");

  const xBig = BigInt(X);
  const yBig = BigInt(Y);

  // Compress the SECP256k1 point: 1-byte prefix (02 = even Y, 03 = odd Y) + 32-byte X
  const prefix = yBig % 2n === 0n ? "02" : "03";
  const xHex = xBig.toString(16).padStart(64, "0");
  const compressedHex = `${prefix}${xHex}`; // 66 hex chars = 33 bytes

  // Domain-separated SHA-256 of the compressed point → 32-byte recovery identifier
  // Domain tag "curvy-solana-recovery-v1" prevents cross-context key reuse
  const domainTagHex = Buffer.from("curvy-solana-recovery-v1", "utf8").toString("hex");
  const preimage = `0x${domainTagHex}${compressedHex}` as const;
  const hashHex = sha256(preimage, "bytes"); // ethers returns "0x..." hex

  // Encode as base58 (Solana pubkey format — same Bitcoin base58 alphabet, no checksum)
  return bs58.encode(hashHex);
};

export { deriveSolanaRecoveryPubkey };

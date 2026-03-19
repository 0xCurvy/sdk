import { computeAddress, sha256, encodeBase58 } from "ethers";
import { hash as _hash, CallData, validateAndParseAddress } from "starknet";
import { NETWORK_FLAVOUR, type NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import { CURVY_ACCOUNT_CLASS_HASHES } from "@/constants/starknet";
import { starknetAccountAbi } from "@/contracts/starknet/abi/account";
import type { HexString } from "@/types/helper";
import { decimalStringToHex } from "./decimal-conversions";

const deriveAddress = (rawPubKey?: string, flavour?: NETWORK_FLAVOUR_VALUES) => {
  if (!rawPubKey || !flavour) {
    throw new Error("Couldn't derive address! Missing public key or network flavour.");
  }

  const pubKey = decimalStringToHex(rawPubKey, false);

  switch (flavour) {
    case NETWORK_FLAVOUR.STARKNET: {
      const myCallData = new CallData(starknetAccountAbi);

      const constructorCalldata = myCallData.compile("constructor", {
        public_key: pubKey,
      });
      const salt = "0x3327";

      const address = _hash.calculateContractAddressFromHash(
        salt,
        CURVY_ACCOUNT_CLASS_HASHES[CURVY_ACCOUNT_CLASS_HASHES.length - 1],
        constructorCalldata,
        0,
      );
      return validateAndParseAddress(address) as HexString;
    }
    case NETWORK_FLAVOUR.EVM: {
      return computeAddress(pubKey) as HexString;
    }
  }
};

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
  const preimage = `0x${domainTagHex}${compressedHex}`;
  const hashHex = sha256(preimage); // ethers returns "0x..." hex

  // Encode as base58 (Solana pubkey format — same Bitcoin base58 alphabet, no checksum)
  return encodeBase58(hashHex);
};

import { concat, keccak256 } from "ethers";

const computePrivateKeys = (r_string: string, s_string: string) => {
  const _r = BigInt(r_string);
  const _s = BigInt(s_string);

  const [s, v] = [hash([_s, _r]), hash([_r, _s])];

  if (s === v) throw new Error("Error generating keys: k === v !");

  return { s, v };
};

const hash = (_values: bigint[]) => {
  const values = _values.map((v) => `0x${v.toString(16).length % 2 === 0 ? v.toString(16) : `0${v.toString(16)}`}`);
  const MAX_OUTPUT_LENGTH = 252;
  const MIN_OUTPUT_LENGTH = 180;
  const MIN_VALID_VALUE = 10n ** 70n;

  const preImage = concat(values);
  const hashed = keccak256(preImage).replace("0x", "").slice(1);

  if (hashed.length * 4 > MAX_OUTPUT_LENGTH)
    throw new Error(`Error generating hash: length over ${MAX_OUTPUT_LENGTH} bits`);

  if (hashed.length * 4 < MIN_OUTPUT_LENGTH)
    throw new Error(`Error generating hash: length under ${MIN_OUTPUT_LENGTH} bits`);

  if (BigInt(`0x${hashed}`) < MIN_VALID_VALUE)
    throw new Error(`Error generating hash: hashed value under ${MIN_VALID_VALUE}`);

  return `0${hashed.padStart(MAX_OUTPUT_LENGTH / 4, "0")}`;
};

export { deriveAddress, computePrivateKeys, hash, deriveSolanaRecoveryPubkey };

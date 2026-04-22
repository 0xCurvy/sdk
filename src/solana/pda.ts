/**
 * Program Derived Address (PDA) derivations for Solana portal operations.
 *
 * PDAs are the Solana equivalent of CREATE2 addresses: given the same seeds
 * and program ID, you always get the same address, but no private key exists
 * for a PDA — only the owning program can "sign" for it via CPI.
 *
 * EVM parallel: `PortalFactory.getEntryPortalAddress(ownerHash, recovery)`
 *   uses CREATE2 to compute the deterministic address.
 * Solana: `getProgramDerivedAddress({ seeds: ["portal", ownerHash, recovery], programId })`
 *
 * All functions are pure. Curvy-portal-specific derivations take the program
 * ID explicitly so they can target any deployed instance; Across/Relay helpers
 * use the well-known program IDs from `./constants`.
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { type Address, getAddressEncoder, getBase58Encoder, getProgramDerivedAddress } from "@solana/kit";
import { ACROSS_PROGRAM_ID, CONFIG_SEED, PORTAL_META_SEED, PORTAL_SEED, RELAY_PROGRAM_ID } from "@/constants/solana";
import { encodeU64LE } from "@/utils/solana";

/**
 * Vault PDA — where the user's deposited SOL/SPL sits. This IS the Solana
 * portal address shown to users.
 *
 * Returns kit `Address` types (base58 strings). `@solana/kit`'s
 * `getProgramDerivedAddress` is async (it calls `crypto.subtle.digest`
 * under the hood), so the derivation is async here too.
 */
export async function deriveVaultPda(programAddress: Address, ownerHash: Uint8Array, recoveryPubkey: Address) {
  const encoder = getBase58Encoder();
  return getProgramDerivedAddress({
    programAddress,
    seeds: [PORTAL_SEED, ownerHash, encoder.encode(recoveryPubkey)],
  });
}

/**
 * Metadata PDA — stores per-portal state (is_used, timestamps). Recovery
 * instructions require it in their account list even though the recovery
 * path itself only reads from it.
 */
export async function derivePortalMetaPda(
  programAddress: Address,
  ownerHash: Uint8Array,
  recoveryIdentifier: Address,
): Promise<[Address, number]> {
  const recoveryIdBytes = getAddressEncoder().encode(recoveryIdentifier);
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress,
    seeds: [PORTAL_META_SEED, ownerHash, recoveryIdBytes],
  });
  return [pda, bump];
}

/** Global config PDA — stores the operator address and pause flag. One per program. */
export async function deriveConfigPda(programAddress: Address) {
  return getProgramDerivedAddress({
    programAddress,
    seeds: [CONFIG_SEED],
  });
}

/** Across state PDA (seed=0 on mainnet). The Across "SpokePool" equivalent. */
export async function deriveAcrossStatePda() {
  return getProgramDerivedAddress({
    programAddress: ACROSS_PROGRAM_ID,
    seeds: [new TextEncoder().encode("state"), encodeU64LE(0n)],
  });
}

/** Across event authority PDA — required for Across CPI event emission. */
export async function deriveAcrossEventAuthorityPda() {
  return getProgramDerivedAddress({
    programAddress: ACROSS_PROGRAM_ID,
    seeds: [new TextEncoder().encode("__event_authority")],
  });
}

/**
 * Across delegate PDA — derived from keccak256 of the full deposit parameters.
 * This is the Solana equivalent of the EVM deposit nonce / unique deposit hash.
 * Each unique set of deposit params produces a unique delegate PDA, preventing replay.
 */
export async function deriveAcrossDelegatePda(depositSeedData: Uint8Array) {
  const delegateSeedHash = keccak_256(depositSeedData);
  return getProgramDerivedAddress({
    programAddress: ACROSS_PROGRAM_ID,
    seeds: [new TextEncoder().encode("delegate"), delegateSeedHash],
  });
}

/** Relay depository PDA — the Relay bridge's main state account. */
export async function deriveRelayDepositoryPda() {
  return getProgramDerivedAddress({
    programAddress: RELAY_PROGRAM_ID,
    seeds: [new TextEncoder().encode("relay_depository")],
  });
}

/** Relay vault PDA — where Relay holds deposited funds. */
export async function deriveRelayVaultPda() {
  return getProgramDerivedAddress({
    programAddress: RELAY_PROGRAM_ID,
    seeds: [new TextEncoder().encode("vault")],
  });
}

/**
 * Convert an ownerHash (decimal string from Poseidon, 0x-hex, or plain hex)
 * into a 32-byte buffer suitable for PDA derivation. Pure JS — no `Buffer`
 * dependency, so this works in any environment the SDK targets.
 */
export function ownerHashToBytes(input: string): Uint8Array {
  let hex: string;
  if (input.startsWith("0x") || input.startsWith("0X")) {
    hex = input.slice(2);
  } else if (/^\d+$/.test(input)) {
    hex = BigInt(input).toString(16);
  } else {
    hex = input;
  }
  const normalized = hex.padStart(64, "0").slice(-64);
  return hexToBytes(normalized);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

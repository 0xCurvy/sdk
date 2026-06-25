import { type Address, getBase58Encoder, getProgramDerivedAddress } from "@solana/kit";
import { PORTAL_SEED } from "@/constants/solana";

/**
 * Vault PDA — where the user's deposited SOL/SPL sits. This IS the Solana
 * portal address shown to users.
 *
 * Returns kit `Address` types (base58 strings). `@solana/kit`'s
 * `getProgramDerivedAddress` is async (it calls `crypto.subtle.digest`
 * under the hood), so the derivation is async here too.
 *
 * PDAs are the Solana equivalent of CREATE2 addresses: given the same seeds
 * and program ID you always get the same address, but no private key exists.
 *
 * @example
 * const [vault, bump] = await deriveVaultPda(programAddress, ownerHash, recoveryPubkey);
 * // vault is a deterministic base58 Address; bump is 0..255
 */
export async function deriveVaultPda(programAddress: Address, ownerHash: Uint8Array, recoveryPubkey: Address) {
  const encoder = getBase58Encoder();
  return getProgramDerivedAddress({
    programAddress,
    seeds: [PORTAL_SEED, ownerHash, encoder.encode(recoveryPubkey)],
  });
}

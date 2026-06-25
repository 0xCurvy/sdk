import { keccak_256 } from "@noble/hashes/sha3.js";
import { getProgramDerivedAddress } from "@solana/kit";
import { ACROSS_PROGRAM_ID } from "@/constants/solana";

/**
 * Across delegate PDA — derived from keccak256 of the full deposit parameters.
 * This is the Solana equivalent of the EVM deposit nonce / unique deposit hash.
 * Each unique set of deposit params produces a unique delegate PDA, preventing replay.
 *
 * @example
 * const [delegate, bump] = await deriveAcrossDelegatePda(serializeAcrossDepositSeedData(args));
 */
export async function deriveAcrossDelegatePda(depositSeedData: Uint8Array) {
  const delegateSeedHash = keccak_256(depositSeedData);
  return getProgramDerivedAddress({
    programAddress: ACROSS_PROGRAM_ID,
    seeds: [new TextEncoder().encode("delegate"), delegateSeedHash],
  });
}

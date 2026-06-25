import { getProgramDerivedAddress } from "@solana/kit";
import { ACROSS_PROGRAM_ID } from "@/constants/solana";
import { encodeU64LE } from "@/utils/encoding";

/**
 * Across state PDA (seed=0 on mainnet). The Across "SpokePool" equivalent.
 *
 * @example
 * const [statePda, bump] = await deriveAcrossStatePda();
 */
export async function deriveAcrossStatePda() {
  return getProgramDerivedAddress({
    programAddress: ACROSS_PROGRAM_ID,
    seeds: [new TextEncoder().encode("state"), encodeU64LE(0n)],
  });
}

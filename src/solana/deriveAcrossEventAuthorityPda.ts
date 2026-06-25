import { getProgramDerivedAddress } from "@solana/kit";
import { ACROSS_PROGRAM_ID } from "@/constants/solana";

/**
 * Across event authority PDA — required for Across CPI event emission.
 *
 * @example
 * const [eventAuthority, bump] = await deriveAcrossEventAuthorityPda();
 */
export async function deriveAcrossEventAuthorityPda() {
  return getProgramDerivedAddress({
    programAddress: ACROSS_PROGRAM_ID,
    seeds: [new TextEncoder().encode("__event_authority")],
  });
}

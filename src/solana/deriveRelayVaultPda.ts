import { getProgramDerivedAddress } from "@solana/kit";
import { RELAY_PROGRAM_ID } from "@/constants/solana";

/**
 * Relay vault PDA — where Relay holds deposited funds.
 *
 * @example
 * const [vault, bump] = await deriveRelayVaultPda();
 */
export async function deriveRelayVaultPda() {
  return getProgramDerivedAddress({
    programAddress: RELAY_PROGRAM_ID,
    seeds: [new TextEncoder().encode("vault")],
  });
}

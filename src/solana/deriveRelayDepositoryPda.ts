import { getProgramDerivedAddress } from "@solana/kit";
import { RELAY_PROGRAM_ID } from "@/constants/solana";

/**
 * Relay depository PDA — the Relay bridge's main state account.
 *
 * @example
 * const [depository, bump] = await deriveRelayDepositoryPda();
 */
export async function deriveRelayDepositoryPda() {
  return getProgramDerivedAddress({
    programAddress: RELAY_PROGRAM_ID,
    seeds: [new TextEncoder().encode("relay_depository")],
  });
}

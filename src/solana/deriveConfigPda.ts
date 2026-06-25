import { type Address, getProgramDerivedAddress } from "@solana/kit";
import { CONFIG_SEED } from "@/constants/solana";

/**
 * Global config PDA — stores the operator address and pause flag. One per program.
 *
 * @example
 * const [config, bump] = await deriveConfigPda(programAddress);
 */
export async function deriveConfigPda(programAddress: Address) {
  return getProgramDerivedAddress({
    programAddress,
    seeds: [CONFIG_SEED],
  });
}

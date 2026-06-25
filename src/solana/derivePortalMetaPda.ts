import { type Address, getAddressEncoder, getProgramDerivedAddress } from "@solana/kit";
import { PORTAL_META_SEED } from "@/constants/solana";

/**
 * Metadata PDA — stores per-portal state (is_used, timestamps). Recovery
 * instructions require it in their account list even though the recovery
 * path itself only reads from it.
 *
 * @example
 * const [meta, bump] = await derivePortalMetaPda(programAddress, ownerHash, recoveryIdentifier);
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

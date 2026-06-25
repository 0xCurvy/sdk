import type { Address } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

/**
 * Derive the Associated Token Account for a (mint, owner) pair — thin wrapper
 * around `@solana-program/token`'s `findAssociatedTokenPda` so the recovery
 * path doesn't have to thread the token-program address through every call.
 *
 * @example
 * const ata = await deriveAssociatedTokenAddress(mint, owner);
 * // ata is the deterministic Associated Token Account Address for that pair
 */
export async function deriveAssociatedTokenAddress(mint: Address, owner: Address): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({
    mint,
    owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return ata;
}

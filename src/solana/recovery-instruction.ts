import { AccountRole, type Address, address, getAddressEncoder, type Instruction } from "@solana/kit";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { NATIVE_SOL_MINT, RECOVER_SOL_DISC, RECOVER_SPL_DISC } from "@/constants/solana";

/**
 * Re-export the program-id constants the recovery flow needs. Consumers
 * (including the frontend store and the SDK dispatch) import these from the
 * SDK rather than taking a direct `@solana-program/*` dependency.
 */
export { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, NATIVE_SOL_MINT, SYSTEM_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS };

/**
 * Derive the Associated Token Account for a (mint, owner) pair — thin wrapper
 * around `@solana-program/token`'s `findAssociatedTokenPda` so the recovery
 * path doesn't have to thread the token-program address through every call.
 */
export async function deriveAssociatedTokenAddress(mint: Address, owner: Address): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({
    mint,
    owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return ata;
}

/**
 * Encode a `recover_sol` or `recover_spl` instruction payload.
 *
 * Layout matches the Anchor Borsh encoding expected by the on-chain handlers:
 *   [disc(8)][ownerHash(32)][recoveryIdentifier(32)][recoveryId(1)][signature(64)]
 */
function encodeRecoveryData(
  discriminator: Uint8Array,
  ownerHash: Uint8Array,
  recoveryIdentifier: Address,
  recoveryId: number,
  signature: Uint8Array,
): Uint8Array {
  if (ownerHash.length !== 32) throw new Error("ownerHash must be 32 bytes");
  if (signature.length !== 64) throw new Error("signature must be 64 bytes");

  const recoveryIdentifierBytes = getAddressEncoder().encode(recoveryIdentifier) as Uint8Array;

  const data = new Uint8Array(8 + 32 + 32 + 1 + 64);
  data.set(discriminator, 0);
  data.set(ownerHash, 8);
  data.set(recoveryIdentifierBytes, 40);
  data[72] = recoveryId;
  data.set(signature, 73);
  return data;
}

/**
 * Build a `recover_sol` instruction. Accounts + data match
 * `packages/solana/programs/curvy-portal/src/instructions/recover_sol.rs`.
 *
 * Returns a kit `Instruction` — consumable by
 * `appendTransactionMessageInstruction` without any web3.js adapters.
 */
export function buildRecoverSolInstruction(params: {
  programAddress: Address;
  payer: Address;
  vault: Address;
  recipient: Address;
  portalMeta: Address;
  ownerHash: Uint8Array;
  recoveryIdentifier: Address;
  recoveryId: number;
  signature: Uint8Array;
}): Instruction {
  return {
    programAddress: params.programAddress,
    accounts: [
      { address: params.payer, role: AccountRole.WRITABLE_SIGNER },
      { address: params.vault, role: AccountRole.WRITABLE },
      { address: params.recipient, role: AccountRole.WRITABLE },
      { address: params.portalMeta, role: AccountRole.READONLY },
      { address: address(SYSTEM_PROGRAM_ADDRESS), role: AccountRole.READONLY },
    ],
    data: encodeRecoveryData(
      RECOVER_SOL_DISC,
      params.ownerHash,
      params.recoveryIdentifier,
      params.recoveryId,
      params.signature,
    ),
  };
}

/**
 * Build a `recover_spl` instruction. Vault is read-only (it only signs for
 * the CPI via its PDA seeds), matching the on-chain account constraints in
 * `recover_spl.rs`.
 */
export function buildRecoverSplInstruction(params: {
  programAddress: Address;
  payer: Address;
  vault: Address;
  vaultTokenAccount: Address;
  recipientTokenAccount: Address;
  recipient: Address;
  mint: Address;
  portalMeta: Address;
  ownerHash: Uint8Array;
  recoveryIdentifier: Address;
  recoveryId: number;
  signature: Uint8Array;
}): Instruction {
  return {
    programAddress: params.programAddress,
    accounts: [
      { address: params.payer, role: AccountRole.WRITABLE_SIGNER },
      { address: params.vault, role: AccountRole.READONLY },
      { address: params.vaultTokenAccount, role: AccountRole.WRITABLE },
      { address: params.recipientTokenAccount, role: AccountRole.WRITABLE },
      { address: params.recipient, role: AccountRole.READONLY },
      { address: params.mint, role: AccountRole.READONLY },
      { address: params.portalMeta, role: AccountRole.READONLY },
      { address: address(TOKEN_PROGRAM_ADDRESS), role: AccountRole.READONLY },
      { address: address(ASSOCIATED_TOKEN_PROGRAM_ADDRESS), role: AccountRole.READONLY },
      { address: address(SYSTEM_PROGRAM_ADDRESS), role: AccountRole.READONLY },
    ],
    data: encodeRecoveryData(
      RECOVER_SPL_DISC,
      params.ownerHash,
      params.recoveryIdentifier,
      params.recoveryId,
      params.signature,
    ),
  };
}

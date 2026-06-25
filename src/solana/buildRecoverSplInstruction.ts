import { AccountRole, type Address, address, getAddressEncoder, type Instruction } from "@solana/kit";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { RECOVER_SPL_DISC } from "@/constants/solana";
import { invariant } from "@/utils/invariant";

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
  invariant(ownerHash.length === 32, "ownerHash must be 32 bytes");
  invariant(signature.length === 64, "signature must be 64 bytes");

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
 * Build a `recover_spl` instruction. Vault is read-only (it only signs for
 * the CPI via its PDA seeds), matching the on-chain account constraints in
 * `recover_spl.rs`.
 *
 * @example
 * const ix = buildRecoverSplInstruction({
 *   programAddress, payer, vault, vaultTokenAccount, recipientTokenAccount,
 *   recipient, mint, portalMeta, ownerHash, recoveryIdentifier, recoveryId, signature,
 * });
 * // ix.accounts.length === 10, ix.data.length === 137
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

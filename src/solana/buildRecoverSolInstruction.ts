import { AccountRole, type Address, address, type Instruction } from "@solana/kit";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import { RECOVER_SOL_DISC } from "@/constants/solana";
import { encodeRecoveryData } from "./recoveryData";

/**
 * Build a `recover_sol` instruction. Accounts + data match
 * `packages/solana/programs/curvy-portal/src/instructions/recover_sol.rs`.
 *
 * Returns a kit `Instruction` — consumable by
 * `appendTransactionMessageInstruction` without any web3.js adapters.
 *
 * @example
 * const ix = buildRecoverSolInstruction({
 *   programAddress, payer, vault, recipient, portalMeta,
 *   ownerHash, recoveryIdentifier, recoveryId, signature,
 * });
 * // ix.accounts.length === 5, ix.data.length === 137
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

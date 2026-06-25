import { AccountRole, type Address, address, getAddressEncoder, type Instruction } from "@solana/kit";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import { RECOVER_SOL_DISC } from "@/constants/solana";
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

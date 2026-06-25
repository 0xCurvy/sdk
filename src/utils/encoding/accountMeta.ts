import { type AccountMeta, AccountRole, type Address } from "@solana/kit";

/**
 * Build an account metadata entry for a Solana instruction, mapping the
 * (isSigner, isWritable) pair onto @solana/kit's `AccountRole` enum:
 *   READONLY = 0, WRITABLE = 1, READONLY_SIGNER = 2, WRITABLE_SIGNER = 3.
 *
 * On Solana every account an instruction touches must be declared upfront with
 * its permissions (signer, writable) — enforced by the runtime.
 *
 * @example
 * accountMeta(pubkey, false, false); // { address: pubkey, role: AccountRole.READONLY }
 * accountMeta(pubkey, true, true);   // { address: pubkey, role: AccountRole.WRITABLE_SIGNER }
 */
export function accountMeta(pubkey: Address, isSigner: boolean, isWritable: boolean): AccountMeta {
  const role = isSigner
    ? isWritable
      ? AccountRole.WRITABLE_SIGNER
      : AccountRole.READONLY_SIGNER
    : isWritable
      ? AccountRole.WRITABLE
      : AccountRole.READONLY;
  return { address: pubkey, role };
}

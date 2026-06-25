import { AccountRole, type Address } from "@solana/kit";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { describe, expect, it } from "vitest";
import { RECOVER_SPL_DISC } from "@/constants/solana";
import { buildRecoverSplInstruction } from "./buildRecoverSplInstruction";
import { ownerHashToBytes } from "./ownerHashToBytes";

const PROGRAM = "DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru" as Address;
const PAYER = "99vQwtBwYtrqqD9YSXbdum3KBdxPAVxYTaQ3cfnJSrN2" as Address;
const VAULT = "So11111111111111111111111111111111111111112" as Address;
const VAULT_TA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as Address;
const RECIPIENT_TA = "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs" as Address;
const RECIPIENT = "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9D" as Address;
const MINT = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So" as Address;
const PORTAL_META = "GZQzfwAr3sgFQpNQ4u8oRPLZ4bnu9d7H6n3y8w6yTqHr" as Address;
const RECOVERY_ID_ADDR = "So11111111111111111111111111111111111111112" as Address;

const params = {
  programAddress: PROGRAM,
  payer: PAYER,
  vault: VAULT,
  vaultTokenAccount: VAULT_TA,
  recipientTokenAccount: RECIPIENT_TA,
  recipient: RECIPIENT,
  mint: MINT,
  portalMeta: PORTAL_META,
  ownerHash: ownerHashToBytes("0x01"),
  recoveryIdentifier: RECOVERY_ID_ADDR,
  recoveryId: 2,
  signature: new Uint8Array(64).fill(9),
};

describe("buildRecoverSplInstruction", () => {
  it("targets the given program and lists 10 accounts with the vault read-only", () => {
    const ix = buildRecoverSplInstruction(params);
    expect(ix.programAddress).toBe(PROGRAM);
    expect(ix.accounts).toHaveLength(10);
    expect(ix.accounts?.[0]).toEqual({ address: PAYER, role: AccountRole.WRITABLE_SIGNER });
    expect(ix.accounts?.[1]).toEqual({ address: VAULT, role: AccountRole.READONLY });
    expect(ix.accounts?.[2]).toEqual({ address: VAULT_TA, role: AccountRole.WRITABLE });
    expect(ix.accounts?.[3]).toEqual({ address: RECIPIENT_TA, role: AccountRole.WRITABLE });
    expect(ix.accounts?.[4]).toEqual({ address: RECIPIENT, role: AccountRole.READONLY });
    expect(ix.accounts?.[5]).toEqual({ address: MINT, role: AccountRole.READONLY });
    expect(ix.accounts?.[6]).toEqual({ address: PORTAL_META, role: AccountRole.READONLY });
    expect(ix.accounts?.[7]).toEqual({ address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY });
    expect(ix.accounts?.[8]).toEqual({ address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY });
    expect(ix.accounts?.[9]).toEqual({ address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY });
  });

  it("encodes data with the recover_spl discriminator, recoveryId, and total length 137", () => {
    const ix = buildRecoverSplInstruction(params);
    const data = ix.data as Uint8Array;
    expect(data.length).toBe(8 + 32 + 32 + 1 + 64);
    expect(Array.from(data.slice(0, 8))).toEqual(Array.from(RECOVER_SPL_DISC));
    expect(data[72]).toBe(2);
    expect(Array.from(data.slice(73))).toEqual(Array.from(new Uint8Array(64).fill(9)));
  });

  it("rejects an ownerHash that is not 32 bytes", () => {
    expect(() => buildRecoverSplInstruction({ ...params, ownerHash: new Uint8Array(33) })).toThrow(/32 bytes/);
  });

  it("rejects a signature that is not 64 bytes", () => {
    expect(() => buildRecoverSplInstruction({ ...params, signature: new Uint8Array(65) })).toThrow(/64 bytes/);
  });
});

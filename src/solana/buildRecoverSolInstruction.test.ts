import { AccountRole, type Address } from "@solana/kit";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import { describe, expect, it } from "vitest";
import { RECOVER_SOL_DISC } from "@/constants/solana";
import { buildRecoverSolInstruction } from "./buildRecoverSolInstruction";
import { ownerHashToBytes } from "./ownerHashToBytes";

const PROGRAM = "DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru" as Address;
const PAYER = "99vQwtBwYtrqqD9YSXbdum3KBdxPAVxYTaQ3cfnJSrN2" as Address;
const VAULT = "So11111111111111111111111111111111111111112" as Address;
const RECIPIENT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as Address;
const PORTAL_META = "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs" as Address;
const RECOVERY_ID_ADDR = "So11111111111111111111111111111111111111112" as Address;

const params = {
  programAddress: PROGRAM,
  payer: PAYER,
  vault: VAULT,
  recipient: RECIPIENT,
  portalMeta: PORTAL_META,
  ownerHash: ownerHashToBytes("0x01"),
  recoveryIdentifier: RECOVERY_ID_ADDR,
  recoveryId: 1,
  signature: new Uint8Array(64).fill(7),
};

describe("buildRecoverSolInstruction", () => {
  it("targets the given program and lists 5 accounts in the correct roles", () => {
    const ix = buildRecoverSolInstruction(params);
    expect(ix.programAddress).toBe(PROGRAM);
    expect(ix.accounts).toHaveLength(5);
    expect(ix.accounts?.[0]).toEqual({ address: PAYER, role: AccountRole.WRITABLE_SIGNER });
    expect(ix.accounts?.[1]).toEqual({ address: VAULT, role: AccountRole.WRITABLE });
    expect(ix.accounts?.[2]).toEqual({ address: RECIPIENT, role: AccountRole.WRITABLE });
    expect(ix.accounts?.[3]).toEqual({ address: PORTAL_META, role: AccountRole.READONLY });
    expect(ix.accounts?.[4]).toEqual({ address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY });
  });

  it("encodes data with the recover_sol discriminator, recoveryId, and total length 137", () => {
    const ix = buildRecoverSolInstruction(params);
    const data = ix.data as Uint8Array;
    expect(data.length).toBe(8 + 32 + 32 + 1 + 64);
    expect(Array.from(data.slice(0, 8))).toEqual(Array.from(RECOVER_SOL_DISC));
    expect(data[72]).toBe(1);
    expect(Array.from(data.slice(73))).toEqual(Array.from(new Uint8Array(64).fill(7)));
  });

  it("rejects an ownerHash that is not 32 bytes", () => {
    expect(() => buildRecoverSolInstruction({ ...params, ownerHash: new Uint8Array(31) })).toThrow(/32 bytes/);
  });

  it("rejects a signature that is not 64 bytes", () => {
    expect(() => buildRecoverSolInstruction({ ...params, signature: new Uint8Array(63) })).toThrow(/64 bytes/);
  });
});

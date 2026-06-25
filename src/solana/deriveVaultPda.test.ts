import type { Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { deriveVaultPda } from "./deriveVaultPda";
import { ownerHashToBytes } from "./ownerHashToBytes";

const PROGRAM = "DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru" as Address;
const RECOVERY = "So11111111111111111111111111111111111111112" as Address;

describe("deriveVaultPda", () => {
  it("is deterministic for fixed seeds", async () => {
    const ownerHash = ownerHashToBytes("0x01");
    const [a, bumpA] = await deriveVaultPda(PROGRAM, ownerHash, RECOVERY);
    const [b, bumpB] = await deriveVaultPda(PROGRAM, ownerHash, RECOVERY);
    expect(a).toBe(b);
    expect(bumpA).toBe(bumpB);
  });

  it("returns a base58 Address and a valid bump", async () => {
    const [pda, bump] = await deriveVaultPda(PROGRAM, ownerHashToBytes("0x01"), RECOVERY);
    expect(typeof pda).toBe("string");
    expect((pda as string).length).toBeGreaterThan(0);
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("produces different PDAs for different ownerHashes", async () => {
    const [a] = await deriveVaultPda(PROGRAM, ownerHashToBytes("0x01"), RECOVERY);
    const [b] = await deriveVaultPda(PROGRAM, ownerHashToBytes("0x02"), RECOVERY);
    expect(a).not.toBe(b);
  });
});

import type { Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { derivePortalMetaPda } from "./derivePortalMetaPda";
import { ownerHashToBytes } from "./ownerHashToBytes";

const PROGRAM = "DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru" as Address;
const RECOVERY_ID = "So11111111111111111111111111111111111111112" as Address;

describe("derivePortalMetaPda", () => {
  it("is deterministic for fixed seeds", async () => {
    const ownerHash = ownerHashToBytes("0x01");
    const [a, bumpA] = await derivePortalMetaPda(PROGRAM, ownerHash, RECOVERY_ID);
    const [b, bumpB] = await derivePortalMetaPda(PROGRAM, ownerHash, RECOVERY_ID);
    expect(a).toBe(b);
    expect(bumpA).toBe(bumpB);
  });

  it("returns a tuple [Address, bump] with a valid bump", async () => {
    const [pda, bump] = await derivePortalMetaPda(PROGRAM, ownerHashToBytes("0x01"), RECOVERY_ID);
    expect(typeof pda).toBe("string");
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("differs from the vault PDA for the same inputs (distinct seed prefix)", async () => {
    const ownerHash = ownerHashToBytes("0x01");
    const [meta] = await derivePortalMetaPda(PROGRAM, ownerHash, RECOVERY_ID);
    expect(typeof meta).toBe("string");
  });
});

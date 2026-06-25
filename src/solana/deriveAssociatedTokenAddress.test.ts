import type { Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { deriveAssociatedTokenAddress } from "./deriveAssociatedTokenAddress";

const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as Address;
const OWNER = "99vQwtBwYtrqqD9YSXbdum3KBdxPAVxYTaQ3cfnJSrN2" as Address;
const OTHER_OWNER = "DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru" as Address;

describe("deriveAssociatedTokenAddress", () => {
  it("is deterministic for a fixed (mint, owner) pair", async () => {
    const a = await deriveAssociatedTokenAddress(MINT, OWNER);
    const b = await deriveAssociatedTokenAddress(MINT, OWNER);
    expect(a).toBe(b);
  });

  it("returns a base58 Address", async () => {
    const ata = await deriveAssociatedTokenAddress(MINT, OWNER);
    expect(typeof ata).toBe("string");
    expect((ata as string).length).toBeGreaterThan(0);
  });

  it("derives different ATAs for different owners", async () => {
    const a = await deriveAssociatedTokenAddress(MINT, OWNER);
    const b = await deriveAssociatedTokenAddress(MINT, OTHER_OWNER);
    expect(a).not.toBe(b);
  });
});

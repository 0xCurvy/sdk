import type { Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { deriveConfigPda } from "./deriveConfigPda";

const PROGRAM = "DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru" as Address;
const OTHER = "99vQwtBwYtrqqD9YSXbdum3KBdxPAVxYTaQ3cfnJSrN2" as Address;

describe("deriveConfigPda", () => {
  it("is deterministic for a fixed program", async () => {
    const [a, bumpA] = await deriveConfigPda(PROGRAM);
    const [b, bumpB] = await deriveConfigPda(PROGRAM);
    expect(a).toBe(b);
    expect(bumpA).toBe(bumpB);
  });

  it("returns a base58 Address and a valid bump", async () => {
    const [pda, bump] = await deriveConfigPda(PROGRAM);
    expect(typeof pda).toBe("string");
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("derives different config PDAs for different programs", async () => {
    const [a] = await deriveConfigPda(PROGRAM);
    const [b] = await deriveConfigPda(OTHER);
    expect(a).not.toBe(b);
  });
});

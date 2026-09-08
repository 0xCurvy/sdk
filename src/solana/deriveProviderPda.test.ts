import type { Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { deriveProviderPda } from "./deriveProviderPda";

const PROGRAM = "6cHtg7sPLL9NQQuuyepnkud6PskMWV5yxvU2vXfag4qX" as Address;
const ECO_V1 = "EcooiHrTiMnfUBMw297gvPwX55HD8SCxA61tBBLV3yaV" as Address;
const ECO_V2 = "EcooswwC1NggsckZyF5SeAL9WsgJs3UhPbrqY1apV73F" as Address;

describe("deriveProviderPda", () => {
  it("is deterministic for a fixed (program, provider) pair", async () => {
    const [a, bumpA] = await deriveProviderPda(PROGRAM, ECO_V2);
    const [b, bumpB] = await deriveProviderPda(PROGRAM, ECO_V2);
    expect(a).toBe(b);
    expect(bumpA).toBe(bumpB);
  });

  it("derives a distinct entry per provider program", async () => {
    const [v1] = await deriveProviderPda(PROGRAM, ECO_V1);
    const [v2] = await deriveProviderPda(PROGRAM, ECO_V2);
    expect(v1).not.toBe(v2);
  });

  it("returns a base58 Address and a valid bump", async () => {
    const [pda, bump] = await deriveProviderPda(PROGRAM, ECO_V2);
    expect(typeof pda).toBe("string");
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });
});

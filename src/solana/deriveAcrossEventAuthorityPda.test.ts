import { describe, expect, it } from "vitest";
import { deriveAcrossEventAuthorityPda } from "./deriveAcrossEventAuthorityPda";
import { deriveAcrossStatePda } from "./deriveAcrossStatePda";

describe("deriveAcrossEventAuthorityPda", () => {
  it("is deterministic (no inputs)", async () => {
    const [a, bumpA] = await deriveAcrossEventAuthorityPda();
    const [b, bumpB] = await deriveAcrossEventAuthorityPda();
    expect(a).toBe(b);
    expect(bumpA).toBe(bumpB);
  });

  it("returns a base58 Address and a valid bump", async () => {
    const [pda, bump] = await deriveAcrossEventAuthorityPda();
    expect(typeof pda).toBe("string");
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("differs from the Across state PDA (distinct seed)", async () => {
    const [eventAuth] = await deriveAcrossEventAuthorityPda();
    const [state] = await deriveAcrossStatePda();
    expect(eventAuth).not.toBe(state);
  });
});

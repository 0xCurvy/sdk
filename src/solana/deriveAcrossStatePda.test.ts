import { describe, expect, it } from "vitest";
import { deriveAcrossStatePda } from "./deriveAcrossStatePda";

describe("deriveAcrossStatePda", () => {
  it("is deterministic (no inputs)", async () => {
    const [a, bumpA] = await deriveAcrossStatePda();
    const [b, bumpB] = await deriveAcrossStatePda();
    expect(a).toBe(b);
    expect(bumpA).toBe(bumpB);
  });

  it("returns a base58 Address and a valid bump", async () => {
    const [pda, bump] = await deriveAcrossStatePda();
    expect(typeof pda).toBe("string");
    expect((pda as string).length).toBeGreaterThan(0);
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });
});

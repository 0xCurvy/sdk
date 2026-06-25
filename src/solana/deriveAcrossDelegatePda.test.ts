import { describe, expect, it } from "vitest";
import { deriveAcrossDelegatePda } from "./deriveAcrossDelegatePda";

describe("deriveAcrossDelegatePda", () => {
  it("is deterministic for fixed deposit seed data", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const [a, bumpA] = await deriveAcrossDelegatePda(data);
    const [b, bumpB] = await deriveAcrossDelegatePda(new Uint8Array([1, 2, 3, 4]));
    expect(a).toBe(b);
    expect(bumpA).toBe(bumpB);
  });

  it("returns a base58 Address and a valid bump", async () => {
    const [pda, bump] = await deriveAcrossDelegatePda(new Uint8Array([1, 2, 3, 4]));
    expect(typeof pda).toBe("string");
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("produces a different PDA for different deposit data (replay protection)", async () => {
    const [a] = await deriveAcrossDelegatePda(new Uint8Array([1, 2, 3, 4]));
    const [b] = await deriveAcrossDelegatePda(new Uint8Array([1, 2, 3, 5]));
    expect(a).not.toBe(b);
  });
});

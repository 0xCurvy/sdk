import { describe, expect, it } from "vitest";
import { deriveRelayDepositoryPda } from "./deriveRelayDepositoryPda";

describe("deriveRelayDepositoryPda", () => {
  it("is deterministic (no inputs)", async () => {
    const [a, bumpA] = await deriveRelayDepositoryPda();
    const [b, bumpB] = await deriveRelayDepositoryPda();
    expect(a).toBe(b);
    expect(bumpA).toBe(bumpB);
  });

  it("returns a base58 Address and a valid bump", async () => {
    const [pda, bump] = await deriveRelayDepositoryPda();
    expect(typeof pda).toBe("string");
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });
});

import { describe, expect, it } from "vitest";
import { deriveRelayDepositoryPda } from "./deriveRelayDepositoryPda";
import { deriveRelayVaultPda } from "./deriveRelayVaultPda";

describe("deriveRelayVaultPda", () => {
  it("is deterministic (no inputs)", async () => {
    const [a, bumpA] = await deriveRelayVaultPda();
    const [b, bumpB] = await deriveRelayVaultPda();
    expect(a).toBe(b);
    expect(bumpA).toBe(bumpB);
  });

  it("returns a base58 Address and a valid bump", async () => {
    const [pda, bump] = await deriveRelayVaultPda();
    expect(typeof pda).toBe("string");
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("differs from the Relay depository PDA (distinct seed)", async () => {
    const [vault] = await deriveRelayVaultPda();
    const [depository] = await deriveRelayDepositoryPda();
    expect(vault).not.toBe(depository);
  });
});

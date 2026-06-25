import type { Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { ownerHashToBytes } from "./ownerHashToBytes";
import { signSolRecovery } from "./signSolRecovery";
import { signSplRecovery } from "./signSplRecovery";

const PRIV = (() => {
  const b = new Uint8Array(32);
  b[31] = 1;
  return b;
})();
const PROGRAM = "DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru" as Address;
const RECOVERY_ID = "So11111111111111111111111111111111111111112" as Address;
const RECIPIENT = "99vQwtBwYtrqqD9YSXbdum3KBdxPAVxYTaQ3cfnJSrN2" as Address;
const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as Address;
const OWNER_HASH = ownerHashToBytes("0x01");

const base = {
  secpPrivKey: PRIV,
  programAddress: PROGRAM,
  ownerHash: OWNER_HASH,
  recoveryIdentifier: RECOVERY_ID,
  recipient: RECIPIENT,
  mint: MINT,
};

describe("signSplRecovery", () => {
  it("produces a 64-byte compact signature and a recovery id in 0..3", async () => {
    const { signature, recoveryId } = await signSplRecovery(base);
    expect(signature.length).toBe(64);
    expect(recoveryId).toBeGreaterThanOrEqual(0);
    expect(recoveryId).toBeLessThanOrEqual(3);
  });

  it("is deterministic for fixed inputs", async () => {
    const a = await signSplRecovery(base);
    const b = await signSplRecovery(base);
    expect(Array.from(a.signature)).toEqual(Array.from(b.signature));
    expect(a.recoveryId).toBe(b.recoveryId);
  });

  it("binds the mint — a different mint yields a different signature", async () => {
    const a = await signSplRecovery(base);
    const b = await signSplRecovery({ ...base, mint: RECIPIENT });
    expect(Array.from(a.signature)).not.toEqual(Array.from(b.signature));
  });

  it("differs from the SOL variant (mint + domain string differ)", async () => {
    const spl = await signSplRecovery(base);
    const sol = await signSolRecovery({
      secpPrivKey: PRIV,
      programAddress: PROGRAM,
      ownerHash: OWNER_HASH,
      recoveryIdentifier: RECOVERY_ID,
      recipient: RECIPIENT,
    });
    expect(Array.from(spl.signature)).not.toEqual(Array.from(sol.signature));
  });
});

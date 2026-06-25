import type { Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { ownerHashToBytes } from "./ownerHashToBytes";
import { signSolRecovery } from "./signSolRecovery";

const PRIV = (() => {
  const b = new Uint8Array(32);
  b[31] = 1;
  return b;
})();
const PROGRAM = "DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru" as Address;
const RECOVERY_ID = "So11111111111111111111111111111111111111112" as Address;
const RECIPIENT = "99vQwtBwYtrqqD9YSXbdum3KBdxPAVxYTaQ3cfnJSrN2" as Address;
const OWNER_HASH = ownerHashToBytes("0x01");

const base = {
  secpPrivKey: PRIV,
  programAddress: PROGRAM,
  ownerHash: OWNER_HASH,
  recoveryIdentifier: RECOVERY_ID,
  recipient: RECIPIENT,
};

describe("signSolRecovery", () => {
  it("produces a 64-byte compact signature and a recovery id in 0..3", async () => {
    const { signature, recoveryId } = await signSolRecovery(base);
    expect(signature.length).toBe(64);
    expect(recoveryId).toBeGreaterThanOrEqual(0);
    expect(recoveryId).toBeLessThanOrEqual(3);
  });

  it("is deterministic (RFC 6979 nonces) for fixed inputs", async () => {
    const a = await signSolRecovery(base);
    const b = await signSolRecovery(base);
    expect(Array.from(a.signature)).toEqual(Array.from(b.signature));
    expect(a.recoveryId).toBe(b.recoveryId);
  });

  it("changes the signature when the recipient changes", async () => {
    const a = await signSolRecovery(base);
    const b = await signSolRecovery({ ...base, recipient: PROGRAM });
    expect(Array.from(a.signature)).not.toEqual(Array.from(b.signature));
  });

  it("accepts a hex-string private key equivalently to bytes", async () => {
    const fromBytes = await signSolRecovery(base);
    const fromHex = await signSolRecovery({ ...base, secpPrivKey: "0x01" });
    expect(Array.from(fromBytes.signature)).toEqual(Array.from(fromHex.signature));
  });
});

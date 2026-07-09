import { describe, expect, it } from "vitest";
import { deriveRecoveryIdentifier } from "./deriveRecoveryIdentifier";

// Fixed, valid secp256k1 private key (32 bytes, less than the curve order).
const PRIV_HEX = `0x${"01".padStart(64, "0")}`;
const PRIV_BYTES = (() => {
  const b = new Uint8Array(32);
  b[31] = 1;
  return b;
})();

describe("deriveRecoveryIdentifier", () => {
  it("is deterministic for a fixed private key", async () => {
    const a = await deriveRecoveryIdentifier(PRIV_BYTES);
    const b = await deriveRecoveryIdentifier(PRIV_BYTES);
    expect(a.recoveryIdentifier).toBe(b.recoveryIdentifier);
    expect(Array.from(a.compressedPubKey)).toEqual(Array.from(b.compressedPubKey));
  });

  it("accepts a hex string and bytes equivalently", async () => {
    const fromHex = await deriveRecoveryIdentifier(PRIV_HEX);
    const fromBytes = await deriveRecoveryIdentifier(PRIV_BYTES);
    expect(fromHex.recoveryIdentifier).toBe(fromBytes.recoveryIdentifier);
  });

  it("returns a 33-byte compressed public key and a base58 Address", async () => {
    const { recoveryIdentifier, compressedPubKey } = await deriveRecoveryIdentifier(PRIV_BYTES);
    expect(compressedPubKey.length).toBe(33);
    expect(typeof recoveryIdentifier).toBe("string");
    expect((recoveryIdentifier as string).length).toBeGreaterThan(0);
  });

  it("produces distinct identifiers for distinct keys", async () => {
    const other = new Uint8Array(32);
    other[31] = 2;
    const a = await deriveRecoveryIdentifier(PRIV_BYTES);
    const b = await deriveRecoveryIdentifier(other);
    expect(a.recoveryIdentifier).not.toBe(b.recoveryIdentifier);
  });
});

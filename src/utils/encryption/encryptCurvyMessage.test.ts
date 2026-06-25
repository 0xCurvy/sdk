import { describe, expect, it } from "vitest";
import { decryptCurvyMessage } from "./decryptCurvyMessage";
import { encryptCurvyMessage } from "./encryptCurvyMessage";

// Deterministic secp256k1 keypairs.
// recipientSAPublicKey is the recipient's UNCOMPRESSED public key expressed as
// the "X.Y" decimal-coordinate string consumed by decimalStringToHex.
const RECIPIENT_PRIV = "0x0000000000000000000000000000000000000000000000000000000000000abc";
const RECIPIENT_PUB =
  "28472748655393009267694063518808149386163109418078082138878164433505686461417.112103652146063681709271542430359369857619412145509508700963842184555907779816";
const SENDER_PRIV = "0x0000000000000000000000000000000000000000000000000000000000000def";

describe("encryptCurvyMessage", () => {
  it("returns the encrypted data envelope plus the sender's SA public key", async () => {
    const enc = await encryptCurvyMessage("gm", SENDER_PRIV, RECIPIENT_PUB);
    expect(enc).toHaveProperty("data");
    expect(enc).toHaveProperty("senderSAPublicKey");
    expect(enc.senderSAPublicKey).toMatch(/^0x04[0-9a-fA-F]{128}$/);
    // data is the JSON envelope produced by encryptData
    expect(() => JSON.parse(enc.data)).not.toThrow();
  });

  it("round-trips via ECDH: recipient decrypts to the original message", async () => {
    const enc = await encryptCurvyMessage("gm", SENDER_PRIV, RECIPIENT_PUB);
    expect(await decryptCurvyMessage(enc, RECIPIENT_PRIV)).toBe(JSON.stringify("gm"));
  });

  it("uses a random IV/salt so two encryptions differ but both decrypt", async () => {
    const a = await encryptCurvyMessage("hi", SENDER_PRIV, RECIPIENT_PUB);
    const b = await encryptCurvyMessage("hi", SENDER_PRIV, RECIPIENT_PUB);
    expect(a.data).not.toBe(b.data);
    expect(await decryptCurvyMessage(a, RECIPIENT_PRIV)).toBe(await decryptCurvyMessage(b, RECIPIENT_PRIV));
  });
});

import { describe, expect, it } from "vitest";
import { decryptCurvyMessage } from "./decryptCurvyMessage";
import { encryptCurvyMessage } from "./encryptCurvyMessage";

const RECIPIENT_PRIV = "0x0000000000000000000000000000000000000000000000000000000000000abc";
const RECIPIENT_PUB =
  "28472748655393009267694063518808149386163109418078082138878164433505686461417.112103652146063681709271542430359369857619412145509508700963842184555907779816";
const SENDER_PRIV = "0x0000000000000000000000000000000000000000000000000000000000000def";

describe("decryptCurvyMessage", () => {
  it("decrypts a message produced by encryptCurvyMessage (ECDH round-trip)", async () => {
    const enc = await encryptCurvyMessage("hello curvy", SENDER_PRIV, RECIPIENT_PUB);
    expect(await decryptCurvyMessage(enc, RECIPIENT_PRIV)).toBe(JSON.stringify("hello curvy"));
  });

  it("fails when decrypting with the wrong recipient key (wrong shared secret)", async () => {
    const enc = await encryptCurvyMessage("hello curvy", SENDER_PRIV, RECIPIENT_PUB);
    const wrongPriv = "0x0000000000000000000000000000000000000000000000000000000000000001";
    await expect(decryptCurvyMessage(enc, wrongPriv)).rejects.toThrow();
  });
});

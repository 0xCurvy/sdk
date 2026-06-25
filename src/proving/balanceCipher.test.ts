import { describe, expect, it } from "vitest";
import { decryptAmountToken, encryptAmountToken } from "./balanceCipher";
import { SNARK_SCALAR_FIELD } from "./merkleTree";

describe("encryptAmountToken / decryptAmountToken (AES-256-CTR additive field-OTP)", () => {
  const sharedSecret = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn % SNARK_SCALAR_FIELD;
  // 2-coord ephemeral PUBLIC key [x, y] (what the contract stores / the recipient sees).
  const ephemeralKey: [bigint, bigint] = [0xfeedfacebadc0de1122334455667788n, 0x0badc0ffee0ddf00dcafebabe1337n];

  it("round-trips amount + token", async () => {
    const amount = 1_000_000_000_000_000_000n;
    const token = 2n;
    const enc = await encryptAmountToken({ amount, token, sharedSecret, ephemeralKey });
    const dec = await decryptAmountToken({ ...enc, sharedSecret, ephemeralKey });
    expect(dec.amount).toBe(amount);
    expect(dec.token).toBe(token);
  });

  it("emits two valid field elements (0 <= c < r)", async () => {
    const enc = await encryptAmountToken({ amount: 1000n * 10n ** 18n, token: 1500n, sharedSecret, ephemeralKey });
    console.log("enc", enc);
    for (const c of [enc.encryptedAmount, enc.encryptedToken]) {
      expect(c).toBeGreaterThanOrEqual(0n);
      expect(c).toBeLessThan(SNARK_SCALAR_FIELD);
    }
    const dec = await decryptAmountToken({ ...enc, sharedSecret, ephemeralKey });
    expect(dec.amount).toBe(1000n * 10n ** 18n);
    expect(dec.token).toBe(1500n);

    console.log("dec", dec);
  });

  it("handles full field-range amounts (mod r is part of the cipher)", async () => {
    const amount = SNARK_SCALAR_FIELD - 1n; // largest field element
    const enc = await encryptAmountToken({ amount, token: 5n, sharedSecret, ephemeralKey });
    expect(enc.encryptedAmount).toBeLessThan(SNARK_SCALAR_FIELD);
    const dec = await decryptAmountToken({ ...enc, sharedSecret, ephemeralKey });
    expect(dec.amount).toBe(amount);
    expect(dec.token).toBe(5n);
  });

  it("masks the plaintext (ciphertext != amount)", async () => {
    const amount = 1234n;
    const enc = await encryptAmountToken({ amount, token: 1n, sharedSecret, ephemeralKey });
    expect(enc.encryptedAmount).not.toBe(amount);
  });

  it("does not recover the plaintext under the wrong sharedSecret", async () => {
    const amount = 7777n;
    const enc = await encryptAmountToken({ amount, token: 9n, sharedSecret, ephemeralKey });
    const dec = await decryptAmountToken({ ...enc, sharedSecret: sharedSecret + 1n, ephemeralKey });
    expect(dec.amount).not.toBe(amount);
  });

  it("binds the keystream to the ephemeralKey (different nonce → different ciphertext)", async () => {
    const a = await encryptAmountToken({ amount: 5n, token: 1n, sharedSecret, ephemeralKey });
    const b = await encryptAmountToken({
      amount: 5n,
      token: 1n,
      sharedSecret,
      ephemeralKey: [ephemeralKey[0] + 1n, ephemeralKey[1]],
    });
    expect(a.encryptedAmount).not.toBe(b.encryptedAmount);
  });

  it("binds the keystream to BOTH ephemeral coords (changing y alone changes the keystream)", async () => {
    const a = await encryptAmountToken({ amount: 5n, token: 1n, sharedSecret, ephemeralKey });
    const b = await encryptAmountToken({
      amount: 5n,
      token: 1n,
      sharedSecret,
      ephemeralKey: [ephemeralKey[0], ephemeralKey[1] + 1n],
    });
    expect(a.encryptedAmount).not.toBe(b.encryptedAmount);
  });
});

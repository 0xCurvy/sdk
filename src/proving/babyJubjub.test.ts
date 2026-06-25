import { verifySignature } from "@zk-kit/eddsa-poseidon";
import { describe, expect, it } from "vitest";
import { generateKeypair } from "@/test/keypair";
import { ephemeralPubKey, pubFromPrivateKey, sign } from "./babyJubjub";
import { decryptAmountToken, encryptAmountToken } from "./balanceCipher";

describe("pubFromPrivateKey", () => {
  it("derives a 2-coord bigint pubkey", () => {
    const kp = generateKeypair();
    const [x, y] = pubFromPrivateKey(kp.privKeyHex);
    expect(typeof x).toBe("bigint");
    expect(typeof y).toBe("bigint");
    expect([x, y]).toEqual(kp.pubKeyBigInt);
  });

  it("is deterministic for a fixed key", () => {
    const k = "0123456789abcdeffedcba98765432100112233445566778899aabbccddeeff";
    expect(pubFromPrivateKey(k)).toEqual(pubFromPrivateKey(k));
  });

  it("produces distinct pubkeys across random keypairs", () => {
    expect(generateKeypair().pubKeyBigInt).not.toEqual(generateKeypair().pubKeyBigInt);
  });
});

describe("ephemeralPubKey", () => {
  it("derives a 2-coord point R = r·B with bigint coords", () => {
    const [x, y] = ephemeralPubKey(0x1234567890abcdefn);
    expect(typeof x).toBe("bigint");
    expect(typeof y).toBe("bigint");
  });

  it("is deterministic and distinct per scalar", () => {
    expect(ephemeralPubKey(5n)).toEqual(ephemeralPubKey(5n));
    expect(ephemeralPubKey(5n)).not.toEqual(ephemeralPubKey(6n));
  });

  it("sender (knows r) and recipient (only sees R) agree on the note keystream", async () => {
    // Sender side: pick ephemeral scalar r, emit R = r·B, encrypt with R.
    const r = 0xdeadbeefcafef00dn;
    const sharedSecret = 0xabcdef1234567890n;
    const R = ephemeralPubKey(r);
    const enc = await encryptAmountToken({ amount: 1_000_000n, token: 2n, sharedSecret, ephemeralKey: R });

    // Recipient side: has only R (read from PendingNotes) — recovers amount+token.
    const dec = await decryptAmountToken({ ...enc, sharedSecret, ephemeralKey: R });
    expect(dec.amount).toBe(1_000_000n);
    expect(dec.token).toBe(2n);
  });
});

describe("sign", () => {
  it("returns a Signature with bigint R8 + S", () => {
    const kp = generateKeypair();
    const s = sign(123n, kp.privKeyHex);
    expect(typeof s.R8[0]).toBe("bigint");
    expect(typeof s.R8[1]).toBe("bigint");
    expect(typeof s.S).toBe("bigint");
  });

  it("is deterministic for same (key, message)", () => {
    const kp = generateKeypair();
    expect(sign(42n, kp.privKeyHex)).toEqual(sign(42n, kp.privKeyHex));
  });

  it("differs across messages", () => {
    const kp = generateKeypair();
    const a = sign(1n, kp.privKeyHex);
    const b = sign(2n, kp.privKeyHex);
    expect(a.S === b.S && a.R8[0] === b.R8[0] && a.R8[1] === b.R8[1]).toBe(false);
  });

  it("verifies with @zk-kit verifySignature under the derived pubkey", () => {
    const kp = generateKeypair();
    const msg = 7777n;
    const s = sign(msg, kp.privKeyHex);
    expect(verifySignature(msg, { R8: [s.R8[0], s.R8[1]], S: s.S }, kp.pubKeyBigInt)).toBe(true);
  });
});

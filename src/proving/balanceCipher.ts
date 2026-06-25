import { SNARK_SCALAR_FIELD } from "./merkleTree";

// Shared byte/field helpers for the note-data cipher, via WebCrypto
// (`globalThis.crypto.subtle`). Works in browsers and Node 20+.

const FIELD_BYTES = 32;

const bigIntToBytes = (value: bigint, length: number): Uint8Array => {
  if (value < 0n) throw new Error("bigIntToBytes: negative value");
  let hex = value.toString(16);
  if (hex.length > length * 2) throw new Error(`bigIntToBytes: value exceeds ${length} bytes`);
  if (hex.length % 2 === 1) hex = `0${hex}`;
  const bytes = new Uint8Array(length);
  const offset = length - hex.length / 2;
  for (let i = 0; i < hex.length; i += 2) {
    bytes[offset + i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

const bytesToBigInt = (bytes: Uint8Array): bigint => {
  if (bytes.length === 0) return 0n;
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return BigInt(`0x${hex}`);
};

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

const asBufferSource = (bytes: Uint8Array): BufferSource => bytes as unknown as BufferSource;

const sha256 = async (data: Uint8Array): Promise<Uint8Array> => {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", asBufferSource(data));
  return new Uint8Array(digest);
};

// ─────────────────────────────────────────────────────────────────────────────
// v2 aggregation note-data codec — AES-256-CTR additive field-OTP.
//
// The v2 `EncryptedNoteData` bus carries the encrypted amount/token as TWO field
// elements (each < r), and they are PUBLIC PROOF SIGNALS — there is no slot for a
// GCM tag or a stored IV. So we use AES-256-CTR as a KEYSTREAM and add it into the
// value IN THE FIELD:
//   enc = (value + keystreamField) mod r     (field-native; always < r, lossless)
//   dec = (enc   − keystreamField) mod r
// Confidentiality is from the cipher; INTEGRITY is from the on-chain
// noteId = Poseidon([ownerHash, amount, token]) — the recipient recomputes it
// after decrypt and rejects on mismatch (the commitment is the MAC). CTR is
// malleable, but a tampered ciphertext only yields a wrong amount → wrong noteId
// → rejected; it can never make the recipient accept a forged amount.
//
// (A byte-oriented AEAD like AES-GCM cannot serve this path: its 16-byte tag has
// no slot in the two field signals, and two full field-element values + a tag
// overflow the ~508-bit capacity. CTR additive field-OTP fits 2 fields exactly;
// the GCM byte-blob codec that used to live here was never wired to any circuit
// and was removed.)
//
// SECURITY INVARIANTS (crypto-advisor to confirm before production):
//   1. Fresh ephemeral per output note ⇒ unique (key, IV) ⇒ no keystream reuse
//      (reuse would leak the difference of two amounts). The load-bearing assumption.
//   2. The recipient MUST verify the recomputed noteId — non-optional.
//
// KEY DERIVATION — HKDF-SHA-256, deliberately NOT PBKDF2/Argon2: `sharedSecret`
// is a ~254-bit high-entropy ECDH output, not a password, so there is nothing to
// brute-force; iteration stretching (OWASP's password-storage guidance) would only
// add latency to scan/decrypt for zero benefit. HKDF (RFC 5869) is the standard KDF
// for DH/ECDH secrets (TLS 1.3 / Signal / Noise). To switch to PBKDF2 instead,
// replace `deriveNoteKeyCtr` (the only KDF call site).
// ─────────────────────────────────────────────────────────────────────────────

const NOTE_KEY_SALT = new TextEncoder().encode("curvy/agg-note/v1"); // fixed domain-separation salt
const NOTE_KEY_INFO = new TextEncoder().encode("curvy/agg-note/v1:amount+token");
const KEYSTREAM_BYTES = 64; // 32 bytes (2 AES blocks) PER value → pad uniform over the WHOLE field
const CTR_COUNTER_BITS = 64;

const modR = (v: bigint): bigint => ((v % SNARK_SCALAR_FIELD) + SNARK_SCALAR_FIELD) % SNARK_SCALAR_FIELD;

const deriveNoteKeyCtr = async (sharedSecret: bigint): Promise<CryptoKey> => {
  const ikm = await globalThis.crypto.subtle.importKey(
    "raw",
    asBufferSource(bigIntToBytes(sharedSecret, FIELD_BYTES)),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return globalThis.crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: asBufferSource(NOTE_KEY_SALT), info: asBufferSource(NOTE_KEY_INFO) },
    ikm,
    { name: "AES-CTR", length: 256 },
    false,
    ["encrypt"],
  );
};

// Initial CTR counter block (16 bytes), bound to the note's 2-coord ephemeral
// PUBLIC key `R = [x, y]` (the value emitted in PendingNotes). Hashing BOTH
// coords means the recipient — who only ever sees `R`, never the private scalar
// — derives the identical nonce. A fresh `R` per output note is what guarantees
// a unique (key, IV) pair (invariant #1).
const deriveCounterBlock = async (ephemeralKey: readonly [bigint, bigint]): Promise<Uint8Array> =>
  (
    await sha256(concat(bigIntToBytes(ephemeralKey[0], FIELD_BYTES), bigIntToBytes(ephemeralKey[1], FIELD_BYTES)))
  ).subarray(0, 16);

// Two field-element keystream pads (amount ← blocks 0–1, token ← blocks 2–3).
// AES-CTR keystream = AES-CTR-encrypt(zeros); 32 bytes/value → near-uniform mod r.
const ctrKeystreamFields = async (
  sharedSecret: bigint,
  ephemeralKey: readonly [bigint, bigint],
): Promise<[bigint, bigint]> => {
  const key = await deriveNoteKeyCtr(sharedSecret);
  const counter = await deriveCounterBlock(ephemeralKey);
  const ks = new Uint8Array(
    await globalThis.crypto.subtle.encrypt(
      { name: "AES-CTR", counter: asBufferSource(counter), length: CTR_COUNTER_BITS },
      key,
      asBufferSource(new Uint8Array(KEYSTREAM_BYTES)),
    ),
  );
  return [modR(bytesToBigInt(ks.subarray(0, 32))), modR(bytesToBigInt(ks.subarray(32, 64)))];
};

export type EncryptedAmountToken = { encryptedAmount: bigint; encryptedToken: bigint };

/**
 * Encrypt a note's amount + token into the two `EncryptedNoteData` field slots
 * (each < r) via an AES-256-CTR additive field-OTP keyed by the note's
 * `sharedSecret` and nonced by its 2-coord ephemeral public key `[x, y]`.
 * Integrity is provided by the on-chain noteId, not the cipher — see the module
 * notes + invariants.
 */
export async function encryptAmountToken(params: {
  amount: bigint;
  token: bigint;
  sharedSecret: bigint;
  ephemeralKey: readonly [bigint, bigint];
}): Promise<EncryptedAmountToken> {
  const [ksAmount, ksToken] = await ctrKeystreamFields(params.sharedSecret, params.ephemeralKey);
  return { encryptedAmount: modR(params.amount + ksAmount), encryptedToken: modR(params.token + ksToken) };
}

/** Inverse of `encryptAmountToken`. The caller MUST verify the recomputed noteId. */
export async function decryptAmountToken(params: {
  encryptedAmount: bigint;
  encryptedToken: bigint;
  sharedSecret: bigint;
  ephemeralKey: readonly [bigint, bigint];
}): Promise<{ amount: bigint; token: bigint }> {
  const [ksAmount, ksToken] = await ctrKeystreamFields(params.sharedSecret, params.ephemeralKey);
  return { amount: modR(params.encryptedAmount - ksAmount), token: modR(params.encryptedToken - ksToken) };
}

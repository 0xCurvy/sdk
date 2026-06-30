import type { Buffer } from "buffer";

/**
 * Shared key-derivation parameters and routine for {@link encryptData} /
 * {@link decryptData}. Both ends MUST derive keys identically, so the KDF lives in
 * one place — a one-sided change to iterations, hash, or output length here would
 * otherwise silently break decryption.
 */

export const PBKDF2_ITERATION_COUNT = 210000;
export const DERIVATION_LENGTH = 256;

const encode = (str: string) => new TextEncoder().encode(str);

const derivePasswordBits = async (password: string, salt: Buffer<ArrayBuffer>) => {
  const key = await crypto.subtle.importKey("raw", encode(password), { name: "PBKDF2", hash: "SHA-512" }, false, [
    "deriveBits",
  ]);
  return await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATION_COUNT,
      hash: "SHA-512",
    },
    key,
    DERIVATION_LENGTH,
  );
};

const convertBitsToCryptoKey = async (derivedBits: ArrayBuffer) => {
  return await crypto.subtle.importKey("raw", derivedBits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

export const deriveKey = async (password: string, salt: Buffer<ArrayBuffer>) => {
  const derivedBits = await derivePasswordBits(password, salt);
  return await convertBitsToCryptoKey(derivedBits);
};

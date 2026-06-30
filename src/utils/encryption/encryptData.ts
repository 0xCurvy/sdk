import { Buffer } from "buffer";
import { deriveKey } from "@/utils/encryption/kdf";

const SALT_LENGTH = 32;
const IV_LENGTH = 12;

const encode = (str: string) => new TextEncoder().encode(str);

const encrypt = async (plainText: string, password: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(SALT_LENGTH)));

  const key = await deriveKey(password, salt);

  const encRes = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encode(plainText),
  );

  const si = Buffer.from(new Uint8Array(encRes)).toString("hex");

  return { si, n: Buffer.from(iv).toString("hex"), so: salt.toString("hex") };
};

/**
 * Serializes any JSON-serializable value, encrypts it with AES-GCM under a
 * key derived from `password` (PBKDF2-SHA512), and returns the result as a
 * JSON string `{ si, n, so }` (ciphertext, IV nonce, salt — all hex).
 *
 * @example
 * const blob = await encryptData({ secret: 42 }, "pw");
 * // await decryptData(blob, "pw") === JSON.stringify({ secret: 42 })
 */
const encryptData = async <T>(data: T, password: string) => {
  return JSON.stringify(await encrypt(JSON.stringify(data), password));
};

export { encryptData };

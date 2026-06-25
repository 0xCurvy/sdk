import { Buffer } from "buffer";

const PBDKF2_ITERATION_COUNT = 210000;
const DERIVATION_LENGTH = 256;

const encode = (str: string) => new TextEncoder().encode(str);

const decode = (buffer: ArrayBuffer) => new TextDecoder().decode(buffer);

const derivePasswordBits = async (password: string, salt: Buffer<ArrayBuffer>) => {
  const key = await crypto.subtle.importKey("raw", encode(password), { name: "PBKDF2", hash: "SHA-512" }, false, [
    "deriveBits",
  ]);
  return await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBDKF2_ITERATION_COUNT,
      hash: "SHA-512",
    },
    key,
    DERIVATION_LENGTH,
  );
};

const convertBitsToCryptoKey = async (derivedBits: ArrayBuffer) => {
  return await crypto.subtle.importKey("raw", derivedBits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

const deriveKey = async (password: string, salt: Buffer<ArrayBuffer>) => {
  const derivedBits = await derivePasswordBits(password, salt);
  return await convertBitsToCryptoKey(derivedBits);
};

const decrypt = async (cipherText: string, password: string, iv: string, salt: string) => {
  const key = await deriveKey(password, Buffer.from(salt, "hex"));

  const plainText = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: Buffer.from(iv, "hex"),
    },
    key,
    Buffer.from(cipherText, "hex"),
  );

  return decode(plainText);
};

type EncryptedData = {
  si: string;
  n: string;
  so: string;
};

function assertEncryptedData(data: unknown): asserts data is EncryptedData {
  if (!data || typeof data !== "object" || !("si" in data) || !("n" in data) || !("so" in data)) {
    throw new Error("Invalid encrypted data");
  }
}

/**
 * Parses a JSON string produced by `encryptData` (`{ si, n, so }`), validates
 * its shape, and decrypts it with AES-GCM under a key derived from `password`.
 * Returns the original serialized plaintext string.
 *
 * @example
 * const blob = await encryptData({ secret: 42 }, "pw");
 * await decryptData(blob, "pw"); // '{"secret":42}'
 *
 * @throws "Invalid encrypted data" if the parsed object lacks `si`, `n`, or `so`.
 */
const decryptData = async (data: string, password: string) => {
  const parsedData = JSON.parse(data);

  assertEncryptedData(parsedData);

  const { si, so, n } = parsedData;

  return decrypt(si, password, n, so);
};

export { decryptData };

import { Buffer } from "buffer";
import { deriveKey } from "@/utils/encryption/kdf";

const decode = (buffer: ArrayBuffer) => new TextDecoder().decode(buffer);

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

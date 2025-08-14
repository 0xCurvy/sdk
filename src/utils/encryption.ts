import { ProjectivePoint } from "@noble/secp256k1";
import { ethers } from "ethers";
import { bytesToHex } from "viem";
import { decimalStringToHex } from "@/utils/decimal-conversions";

const PBDKF2_ITERATION_COUNT = 210000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;
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

const encryptData = async <T>(data: T, password: string) => {
  return JSON.stringify(await encrypt(JSON.stringify(data), password));
};

const decryptData = async (data: string, password: string) => {
  const parsedData = JSON.parse(data);

  assertEncryptedData(parsedData);

  const { si, so, n } = parsedData;

  return decrypt(si, password, n, so);
};

const getPublicKey = (privateKey: string) => {
  const signer = new ethers.SigningKey(`0x${privateKey.replace("0x", "")}`);
  return signer.publicKey;
};

type EncryptedCurvyMessage = {
  data: string;
  senderStealthPublicKey: string;
};
const encryptCurvyMessage = async (
  message: string,
  senderStealthPrivateKey: string,
  recipientStealthPublicKey: string,
): Promise<EncryptedCurvyMessage> => {
  const uncompressedHexPublicKey = decimalStringToHex(recipientStealthPublicKey);
  const point = ProjectivePoint.fromHex(uncompressedHexPublicKey);
  const compressedBytes = point.toRawBytes(true);
  const compressedHex = `0x${bytesToHex(compressedBytes)}`;

  const _senderStealthPrivateKey = `0x${senderStealthPrivateKey.replace("0x", "").padStart(64, "0")}`;
  const signer = new ethers.Wallet(_senderStealthPrivateKey);

  const password = signer.signingKey.computeSharedSecret(compressedHex);

  return { data: await encryptData(message, password), senderStealthPublicKey: getPublicKey(senderStealthPrivateKey) };
};

const decryptCurvyMessage = async <T extends EncryptedCurvyMessage>(
  encryptedData: T,
  recipientStealthPrivateKey: string,
): Promise<string> => {
  const { data, senderStealthPublicKey } = encryptedData;

  const signer = new ethers.Wallet(recipientStealthPrivateKey);
  const password = signer.signingKey.computeSharedSecret(senderStealthPublicKey);

  return decryptData(data, password);
};

const signMessage = (message: string, spendingPrivateKey: string): string => {
  const signer = new ethers.Wallet(`0x${spendingPrivateKey}`); // Use Wallet instead of SigningKey
  const signature = signer.signingKey.sign(ethers.hashMessage(message));

  return signature.serialized;
};

export { encryptData, decryptData, signMessage, encryptCurvyMessage, decryptCurvyMessage };

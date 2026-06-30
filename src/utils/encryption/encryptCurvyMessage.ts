import { ProjectivePoint } from "@noble/secp256k1";
import { ethers } from "ethers";
import { bytesToHex } from "viem";
import { decimalStringToHex } from "@/utils/encoding";
import { encryptData } from "@/utils/encryption";
import { normalizePrivateKey } from "@/utils/encryption/normalizePrivateKey";

type EncryptedCurvyMessage = {
  data: string;
  senderSAPublicKey: string;
};

const getPublicKey = (privateKey: string) => {
  const signer = new ethers.SigningKey(`0x${privateKey.replace("0x", "")}`);
  return signer.publicKey;
};

/**
 * Encrypts a message for a recipient using an ECDH shared secret derived from
 * the sender's stealth-address (SA) private key and the recipient's SA public
 * key, then AES-encrypts the payload. Returns the ciphertext plus the sender's
 * SA public key so the recipient can re-derive the same secret.
 *
 * @example
 * const enc = await encryptCurvyMessage("gm", senderSAPrivateKey, recipientSAPublicKeyDecimal);
 * // await decryptCurvyMessage(enc, recipientSAPrivateKey) === '"gm"'
 */
const encryptCurvyMessage = async (
  message: string,
  senderSAPrivateKey: string,
  recipientSAPublicKey: string,
): Promise<EncryptedCurvyMessage> => {
  const uncompressedHexPublicKey = decimalStringToHex(recipientSAPublicKey);
  const point = ProjectivePoint.fromHex(uncompressedHexPublicKey);
  const compressedBytes = point.toRawBytes(true);
  const compressedHex = bytesToHex(compressedBytes);

  const _senderSAPrivateKey = `0x${normalizePrivateKey(senderSAPrivateKey)}`;
  const signer = new ethers.Wallet(_senderSAPrivateKey);

  const password = signer.signingKey.computeSharedSecret(compressedHex);

  return { data: await encryptData(message, password), senderSAPublicKey: getPublicKey(senderSAPrivateKey) };
};

export { encryptCurvyMessage, type EncryptedCurvyMessage };

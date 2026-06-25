import { ethers } from "ethers";
import { decryptData } from "@/utils/encryption";

type EncryptedCurvyMessage = {
  data: string;
  senderSAPublicKey: string;
};

/**
 * Decrypts a message produced by `encryptCurvyMessage`. Re-derives the ECDH
 * shared secret from the recipient's stealth-address (SA) private key and the
 * embedded sender SA public key, then AES-decrypts the payload.
 *
 * @example
 * const enc = await encryptCurvyMessage("gm", senderSAPrivateKey, recipientSAPublicKeyDecimal);
 * await decryptCurvyMessage(enc, recipientSAPrivateKey); // '"gm"'
 */
const decryptCurvyMessage = async <T extends EncryptedCurvyMessage>(
  encryptedData: T,
  recipientSAPrivateKey: string,
): Promise<string> => {
  const { data, senderSAPublicKey } = encryptedData;

  const signer = new ethers.Wallet(recipientSAPrivateKey);
  const password = signer.signingKey.computeSharedSecret(senderSAPublicKey);

  return decryptData(data, password);
};

export { decryptCurvyMessage, type EncryptedCurvyMessage };

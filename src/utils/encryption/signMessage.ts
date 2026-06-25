import { ethers } from "ethers";

/**
 * Signs an EIP-191 personal message with the given spending private key and
 * returns the serialized ECDSA signature. Deterministic for a fixed key+message.
 *
 * @example
 * const sig = signMessage("hello", "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
 * // sig === signMessage("hello", "59c6...690d") // deterministic
 */
const signMessage = (message: string, spendingPrivateKey: string): string => {
  const signer = new ethers.Wallet(`0x${spendingPrivateKey}`); // Use Wallet instead of SigningKey
  const signature = signer.signingKey.sign(ethers.hashMessage(message));

  return signature.serialized;
};

export { signMessage };

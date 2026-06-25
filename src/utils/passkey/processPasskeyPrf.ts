import { CURVE, signAsync } from "@noble/secp256k1";
import { privateKeyToAddress } from "viem/accounts";
import { encode } from "@/utils/common";
import { bufferSourceToBuffer } from "@/utils/encryption";
import { invariant } from "@/utils/invariant";

const PBDKDF2_ITERATIONS = 600_000;
const HASHED_PRF_LENGTH = 256;
const SALT = encode("Curvy Protocol says 'Zdravo'!");

/**
 * Derives a deterministic secp256k1 signing key from a passkey PRF output and
 * returns a signature over a fixed Curvy challenge message together with the
 * derived address.
 *
 * The PRF bytes are stretched with PBKDF2 (SHA-256, 600k iterations) over a
 * fixed salt, reduced modulo the secp256k1 curve order to obtain a private key,
 * then used to sign a constant message. Same PRF input always yields the same
 * `{ r, s, prfAddress }`.
 *
 * @example
 * const prf = new Uint8Array(32).fill(7);
 * const { r, s, prfAddress } = await processPasskeyPrf(prf);
 * // prfAddress -> "0x..." (deterministic for this prf)
 *
 * @throws if the derived signing key reduces to zero.
 */
export const processPasskeyPrf = async (prfOut: BufferSource) => {
  const prfCryptoKey = await crypto.subtle.importKey("raw", prfOut, { name: "PBKDF2", hash: "SHA-256" }, false, [
    "deriveBits",
  ]);

  const hashedPrf = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: await crypto.subtle.digest("SHA-256", SALT),
      iterations: PBDKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    prfCryptoKey,
    HASHED_PRF_LENGTH,
  );

  const decimalPrf = BigInt(`0x${bufferSourceToBuffer(hashedPrf).toString("hex")}`);

  const prfPrivateKey = (decimalPrf % CURVE.n).toString(16).padStart(64, "0");

  const prfAddress = privateKeyToAddress(`0x${prfPrivateKey}`);

  invariant(decimalPrf !== 0n, "Invalid signing key generated from PRF output.");

  const { r, s } = await signAsync(
    encode("Curvy Protocol requests signature: Curvy Protocol says 'Zdravo'!"),
    prfPrivateKey,
  );

  return { r, s, prfAddress };
};

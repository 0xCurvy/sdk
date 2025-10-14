import { CURVE, signAsync } from "@noble/secp256k1";
import { privateKeyToAddress } from "viem/accounts";
import { bufferSourceToBuffer } from "@/utils/encryption";
import { encode } from "@/utils/helpers";

const PBDKDF2_ITERATIONS = 600_000;
const HASHED_PRF_LENGTH = 256;
const SALT = encode("Curvy Protocol says 'Zdravo'!");

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

  const prfPrivateKey = (decimalPrf % CURVE.n).toString(16);

  const prfAddress = privateKeyToAddress(`0x${prfPrivateKey}`);

  if (decimalPrf === 0n) throw new Error("Invalid signing key generated from PRF output.");

  const { r, s } = await signAsync(
    encode("Curvy Protocol requests signature: Curvy Protocol says 'Zdravo'!"),
    prfPrivateKey,
  );

  return { r, s, prfAddress };
};

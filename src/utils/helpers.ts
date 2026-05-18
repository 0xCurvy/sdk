import { getAddress } from "viem";
import { getSignatureParams as evmGetSignatureParams } from "@/constants/evm";
import type { EvmSignTypedDataParameters } from "@/types";
import { sleep } from "@/utils/common";

const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
const textEncoder = new TextEncoder();

function toSlug(str: string) {
  return str.replace(" ", "-").toLowerCase();
}

const shaDigest = async (
  alg: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512",
  message: string,
  _outputLength: number | undefined = undefined,
): Promise<string> => {
  const hash = await crypto.subtle.digest(alg, textEncoder.encode(message));
  return Buffer.from(hash).toString("hex").slice(0, undefined);
};

const WALLET_ID_LENGTH = 12;
const generateWalletId = (s: string, v: string) => {
  return shaDigest("SHA-256", JSON.stringify({ s, v }), WALLET_ID_LENGTH);
};

function arrayBufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function encode(message: string) {
  return textEncoder.encode(message);
}

/**
 *  * Polls a function until the criteria is met or max retries is reached.
 *
 * @param pollFunction
 * @param pollCriteria
 * @param {number} [pollAttempts=120] - Maximum number of retries
 * @param {number} [pollDelay=10_000] - Delay between retries in milliseconds
 * @param {(pollAttempt: number, error: unknown) => boolean} [shouldRetry] - Optional function to determine if a retry should be attempted after an error
 */
async function pollForCriteria<T>(
  pollFunction: () => Promise<T>,
  pollCriteria: (res: T) => boolean,
  pollAttempts = 120,
  pollDelay = 10000,
  shouldRetry?: (pollAttempt: number, error: unknown) => boolean,
): Promise<T> {
  for (let pollAttempt = 0; pollAttempt < pollAttempts; pollAttempt++) {
    try {
      const res = await pollFunction();

      if (pollCriteria(res)) {
        return res;
      }
    } catch (error) {
      if (!shouldRetry?.(pollAttempt, error)) {
        throw error;
      }
    }

    await sleep(pollDelay);
  }

  throw new Error(`Polling failed!`);
}

async function getAuthenticationSignatureParams(
  ownerAddress: string,
  password: string,
): Promise<EvmSignTypedDataParameters> {
  const address = getAddress(ownerAddress);

  const preimage = `${address}::${password}`;
  const messageToSign = await shaDigest("SHA-512", preimage);

  return evmGetSignatureParams(messageToSign);
}

export {
  isNode,
  shaDigest,
  generateWalletId,
  textEncoder,
  toSlug,
  arrayBufferToHex,
  encode,
  pollForCriteria,
  getAuthenticationSignatureParams,
};

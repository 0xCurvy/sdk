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
 * @param {number} [maxRetries=120] - Maximum number of retries
 * @param {number} [delayMs=10_000] - Delay between retries in milliseconds
 */
async function pollForCriteria<T>(
  pollFunction: () => Promise<T>,
  pollCriteria: (res: T) => boolean,
  maxRetries = 120,
  delayMs = 10000,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await pollFunction();

    if (pollCriteria(res)) {
      return res;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Polling failed!`);
}

export { isNode, shaDigest, generateWalletId, textEncoder, toSlug, arrayBufferToHex, encode, pollForCriteria };

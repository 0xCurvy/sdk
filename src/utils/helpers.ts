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

export { isNode, shaDigest, generateWalletId, textEncoder, toSlug, arrayBufferToHex, encode };

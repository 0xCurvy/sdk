import { bytesToHex } from "./bytesToHex";

/**
 * Convert a 64-byte `Uint8Array` (two 32-byte big-endian field elements) into a
 * `"X.Y"` decimal public-key string. If already a string, returns it unchanged.
 *
 * @example
 * const bytes = new Uint8Array(64);
 * bytes[31] = 1;
 * bytes[63] = 2;
 * bytesToDecimalString(bytes); // "1.2"
 */
export function bytesToDecimalString(bytes: Uint8Array | string): string {
  if (!(bytes instanceof Uint8Array)) {
    return bytes;
  }

  // Ensure the input length is valid
  const halfLength = bytes.length / 2;
  if (bytes.length % 2 !== 0 || halfLength !== 32) {
    throw new Error("Invalid Uint8Array length. Expected 64 bytes.");
  }

  // Convert back to hex strings
  const hexString = bytesToHex(bytes);

  const xHex = hexString.slice(0, 64);
  const yHex = hexString.slice(64);

  const x = BigInt(`0x${xHex}`);
  const y = BigInt(`0x${yHex}`);

  return `${x}.${y}`;
}

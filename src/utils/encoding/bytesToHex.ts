/**
 * Encode a byte array as an unprefixed, lowercase hex string (two chars per
 * byte, zero-padded).
 *
 * @example
 * bytesToHex(new Uint8Array([1, 2])); // "0102"
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

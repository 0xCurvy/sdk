/**
 * Decode an unprefixed, even-length hex string into its byte array. Uses a
 * manual decoder instead of `Buffer.from` so this code path runs in browser
 * bundles without pulling in a Node Buffer polyfill.
 *
 * @example
 * hexToBytes("0102"); // Uint8Array [1, 2]
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

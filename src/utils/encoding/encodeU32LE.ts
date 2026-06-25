/**
 * Encode a u32 as a 4-byte little-endian array.
 *
 * @example
 * encodeU32LE(1);   // Uint8Array [1, 0, 0, 0]
 * encodeU32LE(256); // Uint8Array [0, 1, 0, 0]
 */
export function encodeU32LE(value: number): Uint8Array {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, value >>> 0, true);
  return new Uint8Array(buf);
}

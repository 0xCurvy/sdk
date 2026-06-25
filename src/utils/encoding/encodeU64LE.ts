/**
 * Encode a u64 as an 8-byte little-endian array (Solana/Borsh native integer format).
 *
 * @example
 * encodeU64LE(1n);   // Uint8Array [1, 0, 0, 0, 0, 0, 0, 0]
 * encodeU64LE(256n); // Uint8Array [0, 1, 0, 0, 0, 0, 0, 0]
 */
export function encodeU64LE(value: bigint): Uint8Array {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setBigUint64(0, value, true);
  return new Uint8Array(buf);
}

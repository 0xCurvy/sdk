/**
 * Convert a `"X.Y"` decimal public-key string into its 64-byte representation
 * (two 32-byte big-endian field elements). If already a `Uint8Array`, returns
 * it unchanged.
 *
 * @example
 * decimalStringToBytes("1.2");
 * // Uint8Array(64) [0,...,1, 0,...,2]
 */
export function decimalStringToBytes(decimal: string | Uint8Array): Uint8Array {
  // Already converted.
  if (typeof decimal !== "string") {
    return decimal;
  }

  const [xStr, yStr] = decimal.split(".");
  const x = BigInt(xStr);
  const y = BigInt(yStr);

  const xBytes = x.toString(16).padStart(64, "0");
  const yBytes = y.toString(16).padStart(64, "0");

  const hex = xBytes + yBytes;

  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have an even length.");
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }

  return array;
}

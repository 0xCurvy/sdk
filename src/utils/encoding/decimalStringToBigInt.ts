import { decimalStringToHex } from "@/utils/encoding/decimalStringToHex";

/**
 * Convert a `"X.Y"` decimal public-key string into a single `bigint` by packing
 * `X` and `Y` into one 512-bit (`0x`-prefixed) value (two packed 256-bit field
 * elements: `X` in the high 256 bits, `Y` in the low 256 bits).
 *
 * @example
 * decimalStringToBigInt("1.2"); // (1n << 256n) | 2n
 */
export function decimalStringToBigInt(decimal: string): bigint {
  return BigInt(decimalStringToHex(decimal, false));
}

import { hexToDecimalString } from "@/utils/encoding/hexToDecimalString";

/**
 * Convert a packed 256-bit `bigint` back into a `"X.Y"` decimal public-key
 * string. The value is zero-padded to 128 hex chars and split into two halves.
 *
 * @example
 * bigIntToDecimalString((1n << 256n) | 2n); // "1.2"
 */
export function bigIntToDecimalString(bigInt: bigint): string {
  const hex = bigInt.toString(16).padStart(128, "0");

  return hexToDecimalString(hex);
}

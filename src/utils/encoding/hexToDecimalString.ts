/**
 * Convert a 128-char hex string (two 64-char halves) back into a `"X.Y"`
 * decimal public-key string. Each half is interpreted as a big-endian field
 * element.
 *
 * @example
 * hexToDecimalString("0".repeat(63) + "1" + "0".repeat(63) + "2"); // "1.2"
 */
export function hexToDecimalString(hex: string): string {
  if (hex.length !== 128) {
    throw new Error("Invalid hex string length. Expected 128 characters.");
  }

  const xHex = hex.slice(0, 64);
  const yHex = hex.slice(64);

  const x = BigInt(`0x${xHex}`);
  const y = BigInt(`0x${yHex}`);

  return `${x}.${y}`;
}

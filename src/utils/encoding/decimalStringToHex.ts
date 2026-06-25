const DECIMAL_KEY_REGEX = /^\d+\.\d+$/;

/**
 * Convert a `"X.Y"` decimal public-key string into a hex string. Each of `X`
 * and `Y` is zero-padded to 64 hex chars; the result is prefixed with `"04"`
 * (uncompressed) or `"0x"`.
 *
 * @example
 * decimalStringToHex("1.2");        // "04" + 64-char X + 64-char Y
 * decimalStringToHex("1.2", false); // "0x" + 64-char X + 64-char Y
 */
export function decimalStringToHex(publicKey: string, uncompressed = true): string {
  if (!publicKey) throw new Error("Public key is required!");

  if (!DECIMAL_KEY_REGEX.test(publicKey)) throw new Error("Invalid public key format!");

  const [X, Y] = publicKey.split(".");
  if (!X || !Y) throw new Error("Invalid public key format!");

  const formatHex = (hex: string) => {
    return BigInt(hex).toString(16).padStart(64, "0");
  };

  return `${uncompressed ? "04" : "0x"}${formatHex(X)}${formatHex(Y)}`;
}

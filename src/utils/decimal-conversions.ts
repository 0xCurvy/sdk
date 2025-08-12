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

const DECIMAL_KEY_REGEX = /^\d+\.\d+$/;

export function decimalStringToHex(publicKey: string, uncompressed = true): string {
  if (!publicKey) throw new Error("Public key is required!");

  if (!DECIMAL_KEY_REGEX.test(publicKey)) throw new Error("Invalid public key format!");

  const [X, Y] = publicKey.split(".");
  if (!X || !Y) throw new Error("Invalid public key format!");

  const formatHex = (hex: string) => {
    return BigInt(hex).toString(16).padStart(64, "0");
  };

  return `0x${uncompressed ? "04" : ""}${formatHex(X)}${formatHex(Y)}`;
}

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
  const hexString = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const xHex = hexString.slice(0, 64);
  const yHex = hexString.slice(64);

  const x = BigInt(`0x${xHex}`);
  const y = BigInt(`0x${yHex}`);

  return `${x}.${y}`;
}

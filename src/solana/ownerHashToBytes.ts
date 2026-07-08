/**
 * Convert a big-endian 256-bit value — given as a decimal string, 0x-hex, or
 * plain hex — into a 32-byte buffer. Used both for ownerHash → PDA seed
 * derivation and for turning a secp256k1 private key (hex/decimal) into its raw
 * 32-byte signing key (see `signSolRecovery`/`signSplRecovery`). Pure JS — no
 * `Buffer` dependency, so this works in any environment the SDK targets.
 *
 * @example
 * ownerHashToBytes("0x01");           // 32 bytes, last byte = 0x01
 * ownerHashToBytes("1");              // decimal → same 32 bytes as "0x01"
 * ownerHashToBytes("ff").length;      // 32
 */
export function ownerHashToBytes(input: string): Uint8Array {
  let hex: string;
  if (input.startsWith("0x") || input.startsWith("0X")) {
    hex = input.slice(2);
  } else if (/^\d+$/.test(input)) {
    hex = BigInt(input).toString(16);
  } else {
    hex = input;
  }
  const normalized = hex.padStart(64, "0").slice(-64);
  return hexToBytes(normalized);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

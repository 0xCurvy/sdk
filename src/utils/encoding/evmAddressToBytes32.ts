import { hexToBytes } from "./hexToBytes";

/**
 * Convert an EVM hex address (20 bytes) into a 32-byte left-padded array.
 * Across's Solana program stores cross-chain addresses as `[u8; 32]`, where EVM
 * addresses are placed at bytes 12..32 (like Solidity's `abi.encode(address)`).
 *
 * @example
 * evmAddressToBytes32("0x0000000000000000000000000000000000000001");
 * // Uint8Array of length 32 with the address right-aligned (last byte = 1)
 */
export function evmAddressToBytes32(hexAddress: string): Uint8Array {
  const clean = hexAddress.replace("0x", "").toLowerCase();
  const buf = new Uint8Array(32);
  // Use a hex decoder instead of `Buffer.from` so this code path runs in
  // browser bundles without pulling in a Node Buffer polyfill.
  buf.set(hexToBytes(clean), 12);
  return buf;
}

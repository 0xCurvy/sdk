/**
 * Encode a bigint as a 32-byte big-endian array — Across's format for cross-chain
 * amounts. This matches EVM's `uint256` encoding (abi.encode), NOT Solana's native
 * LE format. Only the low 64 bits are written; they occupy the last 8 bytes.
 *
 * @example
 * amountToBytes32BE(1n);   // 32 bytes, last byte = 1
 * amountToBytes32BE(256n); // 32 bytes, byte[30] = 1, byte[31] = 0
 */
export function amountToBytes32BE(amount: bigint): Uint8Array {
  const buf = new Uint8Array(32);
  const beBytes: number[] = [];
  let n = amount;
  for (let i = 0; i < 8; i++) {
    beBytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  for (let i = 0; i < 8; i++) buf[24 + i] = beBytes[i];
  return buf;
}

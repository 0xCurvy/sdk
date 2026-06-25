import { concatBytes, encodeU32LE } from "@/utils/encoding";

/**
 * Borsh Vec encoding: a u32 little-endian length prefix followed by the body bytes.
 * Borsh is Solana/Anchor's serialization format — analogous to ABI encoding on EVM
 * but simpler (no 32-byte padding, LE integers, variable-length vecs get a u32 prefix).
 *
 * @example
 * encodeBorshVec(new Uint8Array([0xaa, 0xbb]));
 * // Uint8Array [2, 0, 0, 0, 0xaa, 0xbb]
 */
export function encodeBorshVec(data: Uint8Array): Uint8Array {
  return concatBytes(encodeU32LE(data.length), data);
}

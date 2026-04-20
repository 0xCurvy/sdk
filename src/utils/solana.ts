/**
 * Byte encoding helpers for Solana instructions.
 *
 * Solana uses little-endian encoding for integers (like x86), while EVM uses
 * big-endian (like network byte order). Anchor uses Borsh serialization which
 * is LE. We need both LE (for Solana instruction data) and BE (for Across's
 * cross-chain uint256 amounts which must match EVM's big-endian layout).
 *
 * Lives in the SDK because the backend's bridge flow and the SDK's recovery
 * flow both produce Solana instruction bytes — sharing one encoder avoids
 * drift between the two code paths.
 */

import { type AccountMeta, AccountRole, type Address } from "@solana/kit";
import type { AcrossQuoteParams } from "@/types/solana";

/** Encode u64 as 8-byte little-endian (Solana/Borsh native integer format). */
export function encodeU64LE(value: bigint): Uint8Array {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setBigUint64(0, value, true);
  return new Uint8Array(buf);
}

/** Encode u32 as 4-byte little-endian. */
export function encodeU32LE(value: number): Uint8Array {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, value >>> 0, true);
  return new Uint8Array(buf);
}

/** Concatenate multiple Uint8Array buffers into one. */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Build an account metadata entry for a Solana instruction.
 *
 * On EVM you just pass addresses as function arguments. On Solana, every account
 * the instruction touches must be declared upfront with its permissions (signer,
 * writable). This is enforced by the runtime — the transaction will fail if an
 * account is missing or has wrong permissions. Think of it like a more explicit
 * version of Solidity's `payable` and access control, but at the transaction level.
 *
 * Uses @solana/kit's AccountRole enum:
 *   READONLY = 0, WRITABLE = 1, READONLY_SIGNER = 2, WRITABLE_SIGNER = 3
 */
export function accountMeta(pubkey: Address, isSigner: boolean, isWritable: boolean): AccountMeta {
  const role = isSigner
    ? isWritable
      ? AccountRole.WRITABLE_SIGNER
      : AccountRole.READONLY_SIGNER
    : isWritable
      ? AccountRole.WRITABLE
      : AccountRole.READONLY;
  return { address: pubkey, role };
}

/**
 * Convert an EVM hex address (20 bytes) into a 32-byte left-padded array.
 * Across's Solana program stores cross-chain addresses as [u8; 32], where
 * EVM addresses are placed at bytes 12..32 (like Solidity's `abi.encode(address)`).
 */
export function evmAddressToBytes32(hexAddress: string): Uint8Array {
  const clean = hexAddress.replace("0x", "").toLowerCase();
  const buf = new Uint8Array(32);
  // Use a hex decoder instead of `Buffer.from` so this code path runs in
  // browser bundles without pulling in a Node Buffer polyfill.
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  buf.set(bytes, 12);
  return buf;
}

/**
 * Encode a bigint as 32-byte big-endian — Across's format for cross-chain amounts.
 * This matches EVM's `uint256` encoding (abi.encode), NOT Solana's native LE format.
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

/**
 * Borsh Vec encoding: u32 LE length prefix + body bytes.
 * Borsh is Solana/Anchor's serialization format, analogous to ABI encoding on EVM
 * but simpler (no 32-byte padding, uses LE, variable-length vecs have u32 prefix).
 */
export function encodeBorshVec(data: Uint8Array): Uint8Array {
  return concatBytes(encodeU32LE(data.length), data);
}

/**
 * Serialize the AcrossQuoteParams struct into the Borsh layout expected by
 * the curvy-portal program's bridge instructions.
 *
 * EVM equivalent: This is like manually ABI-encoding a struct to pass as calldata.
 * On EVM you'd use `abi.encode(recipient, outputToken, outputAmount, ...)`.
 * On Solana with Anchor, the instruction data is [8-byte discriminator][borsh-encoded args].
 */
export function encodeAcrossQuoteParams(params: AcrossQuoteParams): Uint8Array {
  return concatBytes(
    params.recipient,
    params.outputToken,
    params.outputAmount,
    encodeU64LE(params.destinationChainId),
    params.exclusiveRelayer,
    encodeU32LE(params.quoteTimestamp),
    encodeU32LE(params.fillDeadline),
    encodeU32LE(params.exclusivityParameter),
    encodeBorshVec(params.message),
  );
}

/**
 * Serialize Across deposit seed data for the delegate PDA derivation.
 *
 * Across V4 on Solana uses a "delegate" PDA (derived from keccak256 of deposit params)
 * as an authorization mechanism — similar to how EVM Across uses the deposit hash to
 * prevent replay attacks. The delegate PDA must be included as an account in the bridge
 * instruction, and its derivation must exactly match what the Across program computes.
 *
 * If the serialization doesn't match, the PDA won't match, and the transaction reverts
 * with an account mismatch error — similar to an EVM "invalid proof" revert.
 */
export function serializeAcrossDepositSeedData(args: {
  depositor: Uint8Array;
  recipient: Uint8Array;
  inputToken: Uint8Array;
  outputToken: Uint8Array;
  inputAmount: bigint;
  outputAmount: Uint8Array;
  destinationChainId: bigint;
  exclusiveRelayer: Uint8Array;
  quoteTimestamp: number;
  fillDeadline: number;
  exclusivityParameter: number;
  message: Uint8Array;
}): Uint8Array {
  const messageLen = args.message.length;
  const buf = new Uint8Array(224 + messageLen);
  let offset = 0;

  buf.set(args.depositor, offset);
  offset += 32;
  buf.set(args.recipient, offset);
  offset += 32;
  buf.set(args.inputToken, offset);
  offset += 32;
  buf.set(args.outputToken, offset);
  offset += 32;
  buf.set(encodeU64LE(args.inputAmount), offset);
  offset += 8;
  buf.set(args.outputAmount, offset);
  offset += 32;
  buf.set(encodeU64LE(args.destinationChainId), offset);
  offset += 8;
  buf.set(args.exclusiveRelayer, offset);
  offset += 32;

  const dv = new DataView(buf.buffer, buf.byteOffset);
  dv.setUint32(offset, args.quoteTimestamp >>> 0, true);
  offset += 4;
  dv.setUint32(offset, args.fillDeadline >>> 0, true);
  offset += 4;
  dv.setUint32(offset, args.exclusivityParameter >>> 0, true);
  offset += 4;
  dv.setUint32(offset, messageLen >>> 0, true);
  offset += 4;
  buf.set(args.message, offset);

  return buf;
}

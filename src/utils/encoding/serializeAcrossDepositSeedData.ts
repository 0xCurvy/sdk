import { encodeU64LE } from "@/utils/encoding";

/**
 * Serialize Across deposit seed data for the delegate PDA derivation.
 *
 * Across V4 on Solana uses a "delegate" PDA (derived from keccak256 of deposit
 * params) as an authorization mechanism — similar to how EVM Across uses the
 * deposit hash to prevent replay. The serialization must exactly match what the
 * Across program computes, or the PDA mismatches and the transaction reverts.
 *
 * Layout (224 fixed bytes + message): depositor(32) recipient(32) inputToken(32)
 * outputToken(32) inputAmount(u64 LE, 8) outputAmount(32) destinationChainId(u64
 * LE, 8) exclusiveRelayer(32) quoteTimestamp(u32 LE, 4) fillDeadline(u32 LE, 4)
 * exclusivityParameter(u32 LE, 4) messageLen(u32 LE, 4) message(messageLen).
 *
 * @example
 * serializeAcrossDepositSeedData({
 *   depositor: new Uint8Array(32),
 *   recipient: new Uint8Array(32),
 *   inputToken: new Uint8Array(32),
 *   outputToken: new Uint8Array(32),
 *   inputAmount: 1_000_000n,
 *   outputAmount: new Uint8Array(32),
 *   destinationChainId: 8453n,
 *   exclusiveRelayer: new Uint8Array(32),
 *   quoteTimestamp: 1700000000,
 *   fillDeadline: 1700003600,
 *   exclusivityParameter: 0,
 *   message: new Uint8Array(0),
 * }); // Uint8Array of length 224
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

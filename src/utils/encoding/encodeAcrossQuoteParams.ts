import type { AcrossQuoteParams } from "@/types/solana";
import { concatBytes, encodeBorshVec, encodeU32LE, encodeU64LE } from "@/utils/encoding";

/**
 * Serialize the `AcrossQuoteParams` struct into the Borsh layout expected by the
 * curvy-portal program's bridge instructions.
 *
 * EVM equivalent: like manually ABI-encoding a struct for calldata. On Solana
 * with Anchor, instruction data is `[8-byte discriminator][borsh-encoded args]`.
 *
 * @example
 * encodeAcrossQuoteParams({
 *   recipient: new Uint8Array(32),
 *   outputToken: new Uint8Array(32),
 *   outputAmount: new Uint8Array(32),
 *   destinationChainId: 8453n,
 *   exclusiveRelayer: new Uint8Array(32),
 *   quoteTimestamp: 1700000000,
 *   fillDeadline: 1700003600,
 *   exclusivityParameter: 0,
 *   message: new Uint8Array(0),
 * }); // Uint8Array of length 32+32+32+8+32+4+4+4 + (4 + message.length)
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

import { poseidon } from "@/proving/rustCore";

export type PoseidonInput = bigint | number | string;

const toBigInt = (value: PoseidonInput): bigint => {
  if (typeof value === "bigint") return value;

  if (typeof value === "number") {
    if (!Number.isInteger(value)) throw new Error("poseidonHash: number must be integer");
    return BigInt(value);
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return BigInt(trimmed);
  }

  throw new Error(`poseidonHash: unsupported input type ${typeof value}`);
};

/**
 * Poseidon hash over 1..16 field elements. Inputs may be `bigint`, integer
 * `number`, or `0x`-prefixed hex strings; all are coerced to `bigint`.
 *
 * Pure and deterministic — same inputs always yield the same output, and input
 * order is significant.
 *
 * @example
 * poseidonHash([1n, 2n]);        // bigint
 * poseidonHash(5n);              // scalar === poseidonHash([5n])
 * poseidonHash(["0x1", "0x2"]);  // hex coerced === poseidonHash([1n, 2n])
 *
 * @throws if given 0 or more than 16 inputs, a non-integer number, or a
 * non-hex string.
 */
export function poseidonHash(inputs: PoseidonInput[] | PoseidonInput): bigint {
  const array = Array.isArray(inputs) ? inputs : [inputs];
  if (array.length === 0) {
    throw new Error("poseidonHash requires at least 1 input");
  }
  if (array.length > 16) {
    throw new Error(`Poseidon supports arity 1..16, got ${array.length}`);
  }
  return poseidon(array.map(toBigInt));
}

import {
  poseidon1,
  poseidon2,
  poseidon3,
  poseidon4,
  poseidon5,
  poseidon6,
  poseidon7,
  poseidon8,
  poseidon9,
  poseidon10,
  poseidon11,
  poseidon12,
  poseidon13,
  poseidon14,
  poseidon15,
  poseidon16,
} from "poseidon-lite";

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

const byArity = [
  poseidon1,
  poseidon2,
  poseidon3,
  poseidon4,
  poseidon5,
  poseidon6,
  poseidon7,
  poseidon8,
  poseidon9,
  poseidon10,
  poseidon11,
  poseidon12,
  poseidon13,
  poseidon14,
  poseidon15,
  poseidon16,
];

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
  if (array.length === 0) throw new Error("poseidon-lite requires at least 1 input");
  const fn = byArity[array.length - 1];
  if (!fn) throw new Error(`poseidon-lite supports arity 1..16, got ${array.length}`);
  return fn(array.map(toBigInt));
}

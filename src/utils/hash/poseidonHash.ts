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

const byArity: Record<number, (xs: PoseidonInput[]) => bigint> = {
  1: (xs) => poseidon1(xs.map(toBigInt)),
  2: (xs) => poseidon2(xs.map(toBigInt)),
  3: (xs) => poseidon3(xs.map(toBigInt)),
  4: (xs) => poseidon4(xs.map(toBigInt)),
  5: (xs) => poseidon5(xs.map(toBigInt)),
  6: (xs) => poseidon6(xs.map(toBigInt)),
  7: (xs) => poseidon7(xs.map(toBigInt)),
  8: (xs) => poseidon8(xs.map(toBigInt)),
  9: (xs) => poseidon9(xs.map(toBigInt)),
  10: (xs) => poseidon10(xs.map(toBigInt)),
  11: (xs) => poseidon11(xs.map(toBigInt)),
  12: (xs) => poseidon12(xs.map(toBigInt)),
  13: (xs) => poseidon13(xs.map(toBigInt)),
  14: (xs) => poseidon14(xs.map(toBigInt)),
  15: (xs) => poseidon15(xs.map(toBigInt)),
  16: (xs) => poseidon16(xs.map(toBigInt)),
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
  if (array.length === 0) throw new Error("poseidon-lite requires at least 1 input");
  const fn = byArity[array.length];
  if (!fn) throw new Error(`poseidon-lite supports arity 1..16, got ${array.length}`);
  return fn(array);
}

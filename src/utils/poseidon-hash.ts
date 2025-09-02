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

type In = bigint | number | string;

const toBigInt = (v: In): bigint => {
  if (typeof v === "bigint") return v;

  if (typeof v === "number") {
    if (!Number.isInteger(v)) throw new Error("poseidonHash: number must be integer");
    return BigInt(v);
  }

  if (typeof v === "string") {
    const s = v.trim();
    return s.startsWith("0x") || s.startsWith("0X") ? BigInt(s) : BigInt(s);
  }

  throw new Error(`poseidonHash: unsupported input type ${typeof v}`);
};

const fns: Record<number, (xs: In[]) => bigint> = {
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

function poseidonHash(inputs: In[] | In): bigint {
  const arr = Array.isArray(inputs) ? inputs : [inputs];
  if (arr.length === 0) throw new Error("poseidon-lite requires at least 1 input");
  const fn = fns[arr.length];
  if (!fn) throw new Error(`poseidon-lite supports arity 1..16, got ${arr.length}`);
  return fn(arr);
}

export { poseidonHash };

import { Buffer } from "buffer";
import { SNARK_SCALAR_FIELD } from "./merkleTree";
import { sha256BigInt as rustSha256BigInt } from "./rustCore";

export { SNARK_SCALAR_FIELD };

// JSON.stringify replacer that coerces bigints to decimal strings; used when
// serializing bigint-rich circuit inputs for fixtures and diagnostics.
export const serializeJson = (obj: unknown): string =>
  JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);

// 32-byte big-endian packing of each bigint, then SHA-256 over the concat.
// Matches the on-chain `nullifiersHash` digest the v2 circuits verify against.
export const sha256BigInt = async (inputs: bigint[]): Promise<bigint> => {
  return rustSha256BigInt(inputs);
};

// Returns a NEW array padded up to `numElements` with `element`; the input is
// left untouched.
export const padArray = <T>(arr: T[], numElements: number, element: T): T[] => {
  const out = [...arr];
  for (let i = out.length; i < numElements; i += 1) {
    out.push(element);
  }
  return out;
};

export const generateRandomBigInt = (bytes: number = 31): bigint => {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return BigInt(`0x${Buffer.from(buf).toString("hex")}`);
};

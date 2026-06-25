import { Buffer } from "buffer";
import { SNARK_SCALAR_FIELD } from "./merkleTree";

export { SNARK_SCALAR_FIELD };

// JSON.stringify replacer that coerces bigints to decimal strings; used when
// serializing circuit inputs to disk for snarkjs witness generation.
export const serializeJson = (obj: unknown): string =>
  JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);

// 32-byte big-endian packing of each bigint, then SHA-256 over the concat.
// Matches the on-chain `nullifiersHash` digest the v2 circuits verify against.
export const sha256BigInt = async (inputs: bigint[]): Promise<bigint> => {
  const buffer = Buffer.alloc(inputs.length * 32);
  inputs.forEach((value, index) => {
    const offset = index * 32;
    buffer.writeBigUInt64BE(value >> 192n, offset);
    buffer.writeBigUInt64BE((value >> 128n) & 0xffffffffffffffffn, offset + 8);
    buffer.writeBigUInt64BE((value >> 64n) & 0xffffffffffffffffn, offset + 16);
    buffer.writeBigUInt64BE(value & 0xffffffffffffffffn, offset + 24);
  });
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return BigInt(`0x${Buffer.from(digest).toString("hex")}`);
};

export const padArray = <T>(arr: T[], numElements: number, element: T): T[] => {
  for (let i = arr.length; i < numElements; i += 1) {
    arr.push(element);
  }
  return arr;
};

export const generateRandomBigInt = (bytes: number = 31): bigint => {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return BigInt(`0x${Buffer.from(buf).toString("hex")}`);
};

export const generateRandomInt = (min: number, max: number): number =>
  Math.floor(min + Math.random() * (max - min + 1));

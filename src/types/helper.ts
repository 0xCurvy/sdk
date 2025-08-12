import type { Signature as StarknetSignature } from "starknet";

type ExtractKeys<T> = T extends { [key: string]: unknown } ? keyof T : never;
type ExtractValues<T> = T extends { [key: string]: unknown } ? T[keyof T] : never;
type Prettify<T> = { [key in keyof T]: T[key] } & unknown;

type HexString = `0x${string}`;
const isHexString = (value: unknown): value is HexString => {
  return typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value);
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

const isStarkentSignature = (value: unknown): value is StarknetSignature => {
  return isStringArray(value);
};

export type { ExtractKeys, ExtractValues, HexString, Prettify };
export { isHexString, isStringArray, isStarkentSignature };

import { describe, expect, it } from "vitest";
import { poseidonHash } from "./poseidonHash";

describe("poseidonHash", () => {
  it("is deterministic and returns a bigint", () => {
    const result = poseidonHash([1n, 2n]);
    expect(typeof result).toBe("bigint");
    expect(poseidonHash([1n, 2n])).toBe(result);
  });

  it("coerces number, bigint, and 0x-hex inputs equivalently", () => {
    const fromBigint = poseidonHash([1n, 2n]);
    expect(poseidonHash([1, 2])).toBe(fromBigint);
    expect(poseidonHash(["0x1", "0x2"])).toBe(fromBigint);
  });

  it("treats a scalar as a single-element array", () => {
    expect(poseidonHash(5n)).toBe(poseidonHash([5n]));
  });

  it("is order-sensitive", () => {
    expect(poseidonHash([1n, 2n])).not.toBe(poseidonHash([2n, 1n]));
  });

  it("distinguishes arities", () => {
    expect(poseidonHash([1n])).not.toBe(poseidonHash([1n, 1n]));
  });

  it("rejects empty input", () => {
    expect(() => poseidonHash([])).toThrow(/at least 1 input/);
  });

  it("rejects arity above 16", () => {
    expect(() => poseidonHash(Array(17).fill(1n))).toThrow(/1\.\.16/);
  });

  it("rejects non-integer numbers", () => {
    expect(() => poseidonHash([1.5])).toThrow(/integer/);
  });

  it("rejects non-hex strings", () => {
    expect(() => poseidonHash(["nothex"])).toThrow(/unsupported input type/);
  });
});

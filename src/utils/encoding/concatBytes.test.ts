import { describe, expect, it } from "vitest";
import { concatBytes } from "@/utils/encoding/concatBytes";

describe("concatBytes", () => {
  it("concatenates in order", () => {
    expect([...concatBytes(new Uint8Array([1, 2]), new Uint8Array([3, 4, 5]))]).toEqual([1, 2, 3, 4, 5]);
  });

  it("produces a length equal to the sum of all inputs", () => {
    const a = new Uint8Array(3);
    const b = new Uint8Array(5);
    const c = new Uint8Array(7);
    expect(concatBytes(a, b, c).length).toBe(15);
  });

  it("returns an empty buffer when given no arguments", () => {
    expect(concatBytes().length).toBe(0);
  });

  it("handles empty buffers between non-empty ones", () => {
    expect([...concatBytes(new Uint8Array([1]), new Uint8Array([]), new Uint8Array([2]))]).toEqual([1, 2]);
  });

  it("returns a fresh buffer that does not alias its inputs", () => {
    const a = new Uint8Array([1, 2]);
    const result = concatBytes(a);
    result[0] = 99;
    expect([...a]).toEqual([1, 2]);
  });

  it("is deterministic", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5]);
    expect([...concatBytes(a, b)]).toEqual([...concatBytes(a, b)]);
  });
});

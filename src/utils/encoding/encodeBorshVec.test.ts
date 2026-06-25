import { describe, expect, it } from "vitest";
import { encodeBorshVec } from "@/utils/encoding/encodeBorshVec";

describe("encodeBorshVec", () => {
  it("prepends a 4-byte little-endian length prefix", () => {
    const out = encodeBorshVec(new Uint8Array([0xaa, 0xbb]));
    expect([...out.slice(0, 4)]).toEqual([2, 0, 0, 0]);
    expect([...out.slice(4)]).toEqual([0xaa, 0xbb]);
  });

  it("produces a total length of 4 + body length", () => {
    expect(encodeBorshVec(new Uint8Array(0)).length).toBe(4);
    expect(encodeBorshVec(new Uint8Array(10)).length).toBe(14);
  });

  it("encodes an empty vec as a zero length prefix", () => {
    expect([...encodeBorshVec(new Uint8Array(0))]).toEqual([0, 0, 0, 0]);
  });

  it("encodes a length larger than one byte in little-endian", () => {
    const out = encodeBorshVec(new Uint8Array(256));
    expect([...out.slice(0, 4)]).toEqual([0, 1, 0, 0]);
  });

  it("allows recovering the original body from the prefix length", () => {
    const body = new Uint8Array([1, 2, 3, 4, 5]);
    const out = encodeBorshVec(body);
    const len = new DataView(out.buffer, out.byteOffset, 4).getUint32(0, true);
    expect([...out.slice(4, 4 + len)]).toEqual([...body]);
  });
});

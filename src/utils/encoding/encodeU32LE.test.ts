import { describe, expect, it } from "vitest";
import { encodeU32LE } from "@/utils/encoding/encodeU32LE";

describe("encodeU32LE", () => {
  it("always produces 4 bytes", () => {
    expect(encodeU32LE(0).length).toBe(4);
    expect(encodeU32LE(1).length).toBe(4);
    expect(encodeU32LE(0xffffffff).length).toBe(4);
  });

  it("encodes in little-endian order", () => {
    expect([...encodeU32LE(1)]).toEqual([1, 0, 0, 0]);
    expect([...encodeU32LE(256)]).toEqual([0, 1, 0, 0]);
    expect([...encodeU32LE(0x01020304)]).toEqual([0x04, 0x03, 0x02, 0x01]);
  });

  it("encodes zero as all zero bytes", () => {
    expect([...encodeU32LE(0)]).toEqual([0, 0, 0, 0]);
  });

  it("encodes the maximum u32 value as all 0xff bytes", () => {
    expect([...encodeU32LE(0xffffffff)]).toEqual([0xff, 0xff, 0xff, 0xff]);
  });

  it("coerces via unsigned right shift so -1 wraps to the max u32", () => {
    expect([...encodeU32LE(-1)]).toEqual([0xff, 0xff, 0xff, 0xff]);
  });

  it("round-trips through DataView little-endian read", () => {
    const value = 0xcafe1234;
    const bytes = encodeU32LE(value);
    const read = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
    expect(read).toBe(value);
  });

  it("is deterministic", () => {
    expect([...encodeU32LE(42)]).toEqual([...encodeU32LE(42)]);
  });
});

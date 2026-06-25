import { describe, expect, it } from "vitest";
import { encodeU64LE } from "@/utils/encoding/encodeU64LE";

describe("encodeU64LE", () => {
  it("always produces 8 bytes", () => {
    expect(encodeU64LE(0n).length).toBe(8);
    expect(encodeU64LE(1n).length).toBe(8);
    expect(encodeU64LE(2n ** 64n - 1n).length).toBe(8);
  });

  it("encodes in little-endian order", () => {
    expect([...encodeU64LE(1n)]).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect([...encodeU64LE(256n)]).toEqual([0, 1, 0, 0, 0, 0, 0, 0]);
    expect([...encodeU64LE(0x0102030405060708n)]).toEqual([0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
  });

  it("encodes zero as all zero bytes", () => {
    expect([...encodeU64LE(0n)]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("encodes the maximum u64 value as all 0xff bytes", () => {
    expect([...encodeU64LE(2n ** 64n - 1n)]).toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  });

  it("round-trips through DataView little-endian read", () => {
    const value = 0xdeadbeefcafef00dn;
    const bytes = encodeU64LE(value);
    const read = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(0, true);
    expect(read).toBe(value);
  });

  it("is deterministic", () => {
    expect([...encodeU64LE(42n)]).toEqual([...encodeU64LE(42n)]);
  });
});

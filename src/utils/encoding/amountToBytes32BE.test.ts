import { describe, expect, it } from "vitest";
import { amountToBytes32BE } from "@/utils/encoding/amountToBytes32BE";

describe("amountToBytes32BE", () => {
  it("always produces 32 bytes", () => {
    expect(amountToBytes32BE(0n).length).toBe(32);
    expect(amountToBytes32BE(2n ** 64n - 1n).length).toBe(32);
  });

  it("encodes zero as all zero bytes", () => {
    expect([...amountToBytes32BE(0n)]).toEqual(new Array(32).fill(0));
  });

  it("places the value at the end in big-endian order", () => {
    const out = amountToBytes32BE(1n);
    expect([...out.slice(0, 31)]).toEqual(new Array(31).fill(0));
    expect(out[31]).toBe(1);
  });

  it("writes multi-byte values big-endian into the last 8 bytes", () => {
    const out = amountToBytes32BE(256n);
    expect(out[30]).toBe(1);
    expect(out[31]).toBe(0);
  });

  it("encodes the max u64 into the trailing 8 bytes", () => {
    const out = amountToBytes32BE(2n ** 64n - 1n);
    expect([...out.slice(0, 24)]).toEqual(new Array(24).fill(0));
    expect([...out.slice(24)]).toEqual(new Array(8).fill(0xff));
  });

  it("round-trips through a big-endian DataView read of the trailing 8 bytes", () => {
    const value = 0x0102030405060708n;
    const out = amountToBytes32BE(value);
    const read = new DataView(out.buffer, out.byteOffset + 24, 8).getBigUint64(0, false);
    expect(read).toBe(value);
  });

  it("is deterministic", () => {
    expect([...amountToBytes32BE(123456n)]).toEqual([...amountToBytes32BE(123456n)]);
  });
});

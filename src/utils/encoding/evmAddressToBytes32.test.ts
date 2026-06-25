import { describe, expect, it } from "vitest";
import { evmAddressToBytes32 } from "@/utils/encoding/evmAddressToBytes32";

describe("evmAddressToBytes32", () => {
  it("always produces 32 bytes", () => {
    expect(evmAddressToBytes32("0x0000000000000000000000000000000000000001").length).toBe(32);
  });

  it("left-pads the first 12 bytes with zeros", () => {
    const out = evmAddressToBytes32("0xffffffffffffffffffffffffffffffffffffffff");
    expect([...out.slice(0, 12)]).toEqual(new Array(12).fill(0));
  });

  it("places the 20 address bytes right-aligned at offset 12", () => {
    const out = evmAddressToBytes32("0xffffffffffffffffffffffffffffffffffffffff");
    expect([...out.slice(12)]).toEqual(new Array(20).fill(0xff));
  });

  it("decodes the hex address bytes in order", () => {
    const out = evmAddressToBytes32("0x0102030405060708090a0b0c0d0e0f1011121314");
    expect([...out.slice(12)]).toEqual([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13,
      0x14,
    ]);
  });

  it("works with or without the 0x prefix", () => {
    const withPrefix = evmAddressToBytes32("0x00000000000000000000000000000000000000aa");
    const without = evmAddressToBytes32("00000000000000000000000000000000000000aa");
    expect([...without]).toEqual([...withPrefix]);
  });

  it("normalizes uppercase hex to lowercase before decoding", () => {
    const upper = evmAddressToBytes32("0xAABBCCDDEEFF00112233445566778899AABBCCDD");
    const lower = evmAddressToBytes32("0xaabbccddeeff00112233445566778899aabbccdd");
    expect([...upper]).toEqual([...lower]);
    expect(upper[12]).toBe(0xaa);
  });

  it("encodes the last byte at index 31", () => {
    const out = evmAddressToBytes32("0x0000000000000000000000000000000000000001");
    expect(out[31]).toBe(1);
  });
});

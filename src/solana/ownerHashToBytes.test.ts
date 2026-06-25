import { describe, expect, it } from "vitest";
import { ownerHashToBytes } from "./ownerHashToBytes";

describe("ownerHashToBytes", () => {
  it("always returns exactly 32 bytes", () => {
    expect(ownerHashToBytes("0x01").length).toBe(32);
    expect(ownerHashToBytes("1").length).toBe(32);
    expect(ownerHashToBytes("ff").length).toBe(32);
    expect(ownerHashToBytes("0x" + "ab".repeat(32)).length).toBe(32);
  });

  it("left-pads a short hex value into the low-order bytes", () => {
    const bytes = ownerHashToBytes("0x01");
    expect(bytes[31]).toBe(1);
    expect(bytes.slice(0, 31).every((b) => b === 0)).toBe(true);
  });

  it("treats 0x-hex and equivalent decimal identically", () => {
    expect(Array.from(ownerHashToBytes("0xff"))).toEqual(Array.from(ownerHashToBytes("255")));
    expect(Array.from(ownerHashToBytes("0x0100"))).toEqual(Array.from(ownerHashToBytes("256")));
  });

  it("accepts upper-case 0X prefix", () => {
    expect(Array.from(ownerHashToBytes("0X0a"))).toEqual(Array.from(ownerHashToBytes("0x0a")));
  });

  it("treats plain hex (no prefix, non-decimal) as hex", () => {
    const bytes = ownerHashToBytes("0a");
    expect(bytes[31]).toBe(0x0a);
  });

  it("is deterministic", () => {
    expect(Array.from(ownerHashToBytes("0xdeadbeef"))).toEqual(Array.from(ownerHashToBytes("0xdeadbeef")));
  });

  it("round-trips a full 32-byte hex value verbatim", () => {
    const hex = "ab".repeat(32);
    const bytes = ownerHashToBytes("0x" + hex);
    const back = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(back).toBe(hex);
  });

  it("keeps only the low 64 hex chars when given an over-long value", () => {
    const bytes = ownerHashToBytes("0x" + "12".repeat(40));
    expect(bytes.length).toBe(32);
    expect(bytes.every((b) => b === 0x12)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { decimalStringToHex } from "./decimalStringToHex";
import { hexToDecimalString } from "./hexToDecimalString";

describe("hexToDecimalString", () => {
  it("splits a 128-char hex string into two big-endian field elements", () => {
    const hex = `${"0".repeat(63)}1${"0".repeat(63)}2`;
    expect(hexToDecimalString(hex)).toBe("1.2");
  });

  it("round-trips with decimalStringToHex (stripping the '0x' prefix)", () => {
    const decimal = "12345.67890";
    const hex = decimalStringToHex(decimal, false).slice(2); // drop "0x"
    expect(hex.length).toBe(128);
    expect(hexToDecimalString(hex)).toBe(decimal);
  });

  it("throws when the hex string is not exactly 128 characters", () => {
    expect(() => hexToDecimalString("00")).toThrow(/Expected 128 characters/);
    expect(() => hexToDecimalString("0".repeat(127))).toThrow(/Expected 128 characters/);
    expect(() => hexToDecimalString("0".repeat(129))).toThrow(/Expected 128 characters/);
  });
});

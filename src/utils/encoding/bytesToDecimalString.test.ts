import { describe, expect, it } from "vitest";
import { bytesToDecimalString } from "./bytesToDecimalString";
import { decimalStringToBytes } from "./decimalStringToBytes";

describe("bytesToDecimalString", () => {
  it("decodes a 64-byte big-endian array into 'X.Y'", () => {
    const bytes = new Uint8Array(64);
    bytes[31] = 1;
    bytes[63] = 2;
    expect(bytesToDecimalString(bytes)).toBe("1.2");
  });

  it("returns a string input unchanged", () => {
    expect(bytesToDecimalString("already.decimal")).toBe("already.decimal");
  });

  it("round-trips with decimalStringToBytes", () => {
    const decimal =
      "3436724098114173460477437497433937161401474489582738787340426116055046580400.7103555152469513315019886241204988403870567396226955610153380429039381003534";
    expect(bytesToDecimalString(decimalStringToBytes(decimal))).toBe(decimal);
  });

  it("throws when the array is not exactly 64 bytes", () => {
    expect(() => bytesToDecimalString(new Uint8Array(63))).toThrow(/Expected 64 bytes/);
    expect(() => bytesToDecimalString(new Uint8Array(65))).toThrow(/Expected 64 bytes/);
    expect(() => bytesToDecimalString(new Uint8Array(0))).toThrow(/Expected 64 bytes/);
  });
});

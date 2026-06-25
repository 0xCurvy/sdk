import { describe, expect, it } from "vitest";
import { bytesToDecimalString } from "./bytesToDecimalString";
import { decimalStringToBytes } from "./decimalStringToBytes";

describe("decimalStringToBytes", () => {
  it("produces a 64-byte big-endian array for a decimal string", () => {
    const bytes = decimalStringToBytes("1.2");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(64);
    // X occupies the first 32 bytes, Y the last 32, both big-endian.
    expect(bytes[31]).toBe(1);
    expect(bytes[63]).toBe(2);
    // Everything else is zero-padding.
    expect(bytes.slice(0, 31).every((b) => b === 0)).toBe(true);
    expect(bytes.slice(32, 63).every((b) => b === 0)).toBe(true);
  });

  it("returns a Uint8Array input unchanged", () => {
    const input = new Uint8Array([9, 8, 7]);
    expect(decimalStringToBytes(input)).toBe(input);
  });

  it("round-trips through bytesToDecimalString", () => {
    const decimal =
      "3436724098114173460477437497433937161401474489582738787340426116055046580400.7103555152469513315019886241204988403870567396226955610153380429039381003534";
    expect(bytesToDecimalString(decimalStringToBytes(decimal))).toBe(decimal);
  });
});

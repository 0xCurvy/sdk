import { describe, expect, it } from "vitest";
import { bigIntToDecimalString } from "./bigIntToDecimalString";
import { decimalStringToBigInt } from "./decimalStringToBigInt";

describe("bigIntToDecimalString", () => {
  it("unpacks a 256-bit value into a 'X.Y' decimal string", () => {
    expect(bigIntToDecimalString((1n << 256n) | 2n)).toBe("1.2");
  });

  it("zero-pads small values correctly (X = 0)", () => {
    // Only the low half set => X is 0, Y is 5.
    expect(bigIntToDecimalString(5n)).toBe("0.5");
  });

  it("round-trips with decimalStringToBigInt", () => {
    const decimal =
      "3436724098114173460477437497433937161401474489582738787340426116055046580400.7103555152469513315019886241204988403870567396226955610153380429039381003534";
    expect(bigIntToDecimalString(decimalStringToBigInt(decimal))).toBe(decimal);
  });
});

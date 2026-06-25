import { describe, expect, it } from "vitest";
import { bigIntToDecimalString } from "./bigIntToDecimalString";
import { decimalStringToBigInt } from "./decimalStringToBigInt";

describe("decimalStringToBigInt", () => {
  it("packs X and Y into a single 256-bit value", () => {
    // X in the high 128 hex bits, Y in the low — i.e. (X << 256) | Y.
    expect(decimalStringToBigInt("1.2")).toBe((1n << 256n) | 2n);
  });

  it("round-trips with bigIntToDecimalString (migrated from tests/decimal-conversions.test.ts)", () => {
    const ephemeral =
      "3436724098114173460477437497433937161401474489582738787340426116055046580400.7103555152469513315019886241204988403870567396226955610153380429039381003534";

    const bigintValue = decimalStringToBigInt(ephemeral);
    const decimal = bigIntToDecimalString(bigintValue);

    expect(decimal).toBe(ephemeral);
  });

  it("propagates format errors from decimalStringToHex", () => {
    expect(() => decimalStringToBigInt("bad")).toThrow(/Invalid public key format/);
    expect(() => decimalStringToBigInt("")).toThrow(/Public key is required/);
  });
});

import { expect, test } from "vitest";
import { bigIntToDecimalString, decimalStringToBigInt } from "@/utils";

test("decimals", () => {
  const ephemeral =
    "3436724098114173460477437497433937161401474489582738787340426116055046580400.7103555152469513315019886241204988403870567396226955610153380429039381003534";

  const bigintValue = decimalStringToBigInt(ephemeral);
  console.log(bigintValue);

  const decimal = bigIntToDecimalString(bigintValue);
  console.log(decimal);

  expect(decimal).toBe(ephemeral);
});

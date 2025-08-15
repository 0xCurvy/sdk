import { parseUnits } from "viem";
import type { Currency } from "@/types/api";

export const NATIVE_CURRENCY_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export const isNativeCurrency = (currency: Currency): boolean => {
  // Doing three checks because why not, its safer
  return (
    currency.contractAddress === undefined ||
    currency.contractAddress === null ||
    currency.contractAddress === NATIVE_CURRENCY_ADDRESS
  );
};

export const parseDecimal = (amount: string, currency: Currency): bigint => {
  return parseUnits(amount, currency.decimals);
};

import { parseUnits } from "viem";
import type { Currency } from "@/types/api";

export const NATIVE_CURRENCY_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export const parseDecimal = (amount: string, currency: Currency): bigint => {
  return parseUnits(amount, currency.decimals);
};

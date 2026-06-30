import type { CurrencyPrice } from "@/types/api";

/**
 * Build the symbol→{price,decimals} feed from the lean `/prices` response. Sibling of
 * `networksToPriceData` (which reads the same fields off nested network currencies) — used
 * by the price-refresh timer, which polls `/prices` instead of re-pulling all networks.
 */
const pricesToPriceData = (prices: CurrencyPrice[]) =>
  prices.reduce((res, { price, symbol, decimals }) => {
    if (price && !res.has(symbol)) res.set(symbol, { price, decimals });
    return res;
  }, new Map<string, { price: string; decimals: number }>());

export { pricesToPriceData };

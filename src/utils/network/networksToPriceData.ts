import type { Network } from "@/types/api";

const networksToPriceData = (networks: Network[]) => {
  return networks.reduce((res, network) => {
    for (const { price, symbol, decimals } of network.currencies) {
      if (!price) continue;
      if (res.has(symbol)) continue;

      res.set(symbol, { price, decimals });
    }
    return res;
  }, new Map<string, { price: string; decimals: number }>());
};

export { networksToPriceData };

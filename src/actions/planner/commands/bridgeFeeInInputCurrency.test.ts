import { describe, expect, it } from "vitest";
import { bridgeFeeInInputCurrency } from "./bridgeFeeInInputCurrency";

const usdc = {
  chainId: 1,
  address: "0xusdc",
  decimals: 6,
  priceUSD: "1",
};

describe("bridgeFeeInInputCurrency", () => {
  it("converts a foreign-token fee into input-token atomic units", () => {
    const fee = bridgeFeeInInputCurrency({
      action: { fromToken: usdc },
      estimate: {
        feeCosts: [
          {
            amount: "1000000000000000",
            amountUSD: "3.50",
            token: { chainId: 1, address: "0xeth", decimals: 18 },
          },
        ],
      },
    });

    expect(fee).toBe(3_500_000n);
  });

  it("uses the exact amount when the fee is already denominated in the input token", () => {
    const fee = bridgeFeeInInputCurrency({
      action: { fromToken: usdc },
      estimate: {
        feeCosts: [
          {
            amount: "125000",
            amountUSD: "0.125",
            token: { chainId: 1, address: "0xUSDC", decimals: 6 },
          },
        ],
      },
    });

    expect(fee).toBe(125_000n);
  });

  it("rounds a converted fee up to the smallest input-token unit", () => {
    const fee = bridgeFeeInInputCurrency({
      action: { fromToken: { ...usdc, priceUSD: "2" } },
      estimate: {
        feeCosts: [
          {
            amount: "1",
            amountUSD: "0.0000001",
            token: { chainId: 1, address: "0xeth", decimals: 18 },
          },
        ],
      },
    });

    expect(fee).toBe(1n);
  });
});

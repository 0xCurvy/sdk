import { div, from, greaterThan } from "dnum";

type FeeToken = {
  chainId: number;
  address: string;
  decimals: number;
};

type FeeCost = {
  amount: string;
  amountUSD: string;
  token: FeeToken;
};

type QuoteWithFees = {
  action: {
    fromToken: FeeToken & { priceUSD: string };
  };
  estimate: {
    feeCosts?: FeeCost[];
  };
};

/**
 * Normalize LiFi fee costs into the input token's atomic units.
 *
 * LiFi reports every fee in the fee token's own unit. A USDC → ETH route may
 * therefore contain an ETH-denominated fee (18 decimals); treating that integer
 * as USDC atoms (6 decimals) inflates the displayed fee by 10^12.
 */
export function bridgeFeeInInputCurrency(quote: QuoteWithFees): bigint {
  const inputToken = quote.action.fromToken;

  return (quote.estimate.feeCosts ?? []).reduce((total, fee) => {
    const isInputToken =
      fee.token.chainId === inputToken.chainId && fee.token.address.toLowerCase() === inputToken.address.toLowerCase();

    if (isInputToken) return total + BigInt(fee.amount);

    const inputPriceUsd = from(inputToken.priceUSD);
    if (!greaterThan(inputPriceUsd, 0)) {
      throw new Error("Cannot normalize bridge fee without an input-token USD price.");
    }

    const feeInInputCurrency = div(from(fee.amountUSD), inputPriceUsd, {
      decimals: inputToken.decimals,
      rounding: "ROUND_UP",
    });
    return total + feeInInputCurrency[0];
  }, 0n);
}

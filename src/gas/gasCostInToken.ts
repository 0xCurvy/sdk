// ─────────────────────────────────────────────────────────────────────────────
// Gas → token conversion (pure, integer-only).
//
// The operator paymaster pays the native gas to relay a `submitAggregationRequest`
// and is reimbursed by a dedicated output note denominated in the AGGREGATION's
// token. To size that note (SDK side) and to validate it (relayer side), both ends
// must agree on the same conversion:
//
//   gasCostNative = gasUnits * gasPriceWei                     (native wei)
//   gasCostUsd    = gasCostNative / 10^nativeDecimals * nativeUsd
//   tokenAmount   = gasCostUsd / tokenUsd * 10^tokenDecimals   (token base units)
//
// USD prices come from the same feed both ends already use (`Currency.price`, a
// decimal string like "2500.50"). They are parsed to fixed-point integers at a
// shared scale that CANCELS in the ratio, so the absolute scale never matters as
// long as both operands share it. Everything is integer math (no floats), and the
// final division is CEILING so a rounding error never UNDER-charges the operator.
// ─────────────────────────────────────────────────────────────────────────────

/** Fixed-point scale used to turn a decimal USD price string into an integer. */
export const PRICE_DECIMALS = 8;

/** Ceiling division for positive bigints. Never under-charges. */
export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error("ceilDiv: denominator must be positive");
  if (numerator <= 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

/**
 * Parse a decimal USD price string (e.g. `"2500.50"`) into a fixed-point integer
 * scaled by `10^decimals`. Excess fractional digits are TRUNCATED (floor) — a
 * marginally lower price means a marginally higher token threshold, which is the
 * operator-safe direction. Throws on malformed input or a non-positive price (the
 * caller must treat an unpriced token as "cannot quote", not "free").
 */
export function parseUsdPrice(price: string, decimals: number = PRICE_DECIMALS): bigint {
  const trimmed = price.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error(`parseUsdPrice: malformed price "${price}"`);
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const scaled = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
  if (scaled <= 0n) throw new Error(`parseUsdPrice: non-positive price "${price}"`);
  return scaled;
}

/** Scale a value up by `bps` basis points: `value * (10000 + bps) / 10000` (ceil). */
export function addBps(value: bigint, bps: number): bigint {
  if (bps < 0) throw new Error("addBps: bps must be non-negative");
  return ceilDiv(value * BigInt(10_000 + bps), 10_000n);
}

/** Scale a value down by `bps` basis points: `value * (10000 - bps) / 10000` (floor). */
export function subBps(value: bigint, bps: number): bigint {
  if (bps < 0 || bps > 10_000) throw new Error("subBps: bps must be in [0, 10000]");
  return (value * BigInt(10_000 - bps)) / 10_000n;
}

/** A token's USD valuation + decimals — the inputs needed to convert across tokens. */
export interface TokenValuation {
  /** USD price, fixed-point at the shared price scale (see {@link parseUsdPrice}). */
  usd: bigint;
  /** Token decimals (e.g. 18 for ETH, 6 for USDC). */
  decimals: number;
}

/**
 * Convert `amount` (in `from` token base units) into the equivalent value in `to`
 * token base units, via their USD prices:
 *
 *   toAmount = amount * from.usd * 10^to.decimals
 *             ─────────────────────────────────────
 *                  10^from.decimals * to.usd
 *
 * `from.usd` and `to.usd` MUST share the same fixed-point scale (it cancels in the
 * ratio, so the absolute scale is irrelevant). Integer-only and rounded UP, so a
 * rounding error never UNDER-values the result. Throws on a non-positive price or a
 * negative amount (an unpriced token is "cannot quote", not "free").
 */
export function convertTokenAmount(amount: bigint, from: TokenValuation, to: TokenValuation): bigint {
  if (from.usd <= 0n || to.usd <= 0n) throw new Error("convertTokenAmount: prices must be positive");
  if (amount < 0n) throw new Error("convertTokenAmount: amount must be non-negative");
  const numerator = amount * from.usd * 10n ** BigInt(to.decimals);
  const denominator = 10n ** BigInt(from.decimals) * to.usd;
  return ceilDiv(numerator, denominator);
}

export interface GasCostInTokenParams {
  /** Estimated gas units for the transaction. */
  gasUnits: bigint;
  /** Native gas price in wei (legacy gasPrice, or EIP-1559 maxFeePerGas). */
  gasPriceWei: bigint;
  /** Native-token USD price, fixed-point at `priceScale` (see {@link parseUsdPrice}). */
  nativeUsd: bigint;
  /** Output-token USD price, fixed-point at the SAME `priceScale` as `nativeUsd`. */
  tokenUsd: bigint;
  /** Native-token decimals (e.g. 18 for ETH). */
  nativeDecimals: number;
  /** Output-token decimals (the note's token; e.g. 6 for USDC, 18 for DAI). */
  tokenDecimals: number;
}

/**
 * Convert a native-denominated gas cost into the equivalent amount of `token`
 * base units. `nativeUsd` and `tokenUsd` MUST share the same fixed-point scale
 * (it cancels). Result is rounded UP. Throws if either price is non-positive.
 *
 * Composed from {@link convertTokenAmount}: the native gas cost in wei IS an amount
 * in the native token's base units, so reimbursing it in another token is just a
 * token→token conversion.
 */
export function gasCostInToken(params: GasCostInTokenParams): bigint {
  const { gasUnits, gasPriceWei, nativeUsd, tokenUsd, nativeDecimals, tokenDecimals } = params;
  if (gasUnits < 0n || gasPriceWei < 0n) throw new Error("gasCostInToken: gas inputs must be non-negative");

  return convertTokenAmount(
    gasUnits * gasPriceWei,
    { usd: nativeUsd, decimals: nativeDecimals },
    { usd: tokenUsd, decimals: tokenDecimals },
  );
}

import { describe, expect, it } from "vitest";
import { addBps, ceilDiv, convertTokenAmount, gasCostInToken, parseUsdPrice, subBps } from "./gasCostInToken";

describe("parseUsdPrice", () => {
  it("scales an integer price by 10^8", () => {
    expect(parseUsdPrice("2500")).toBe(250_000_000_000n);
  });

  it("scales a fractional price, padding to 8 decimals", () => {
    expect(parseUsdPrice("2500.5")).toBe(250_050_000_000n);
    expect(parseUsdPrice("1.0003")).toBe(100_030_000n);
  });

  it("truncates excess fractional digits (operator-safe: floor)", () => {
    // 9 fractional digits -> truncated to 8
    expect(parseUsdPrice("1.123456789")).toBe(112_345_678n);
  });

  it("honors a custom scale", () => {
    expect(parseUsdPrice("1.5", 2)).toBe(150n);
  });

  it("throws on malformed or non-positive prices", () => {
    expect(() => parseUsdPrice("abc")).toThrow(/malformed/);
    expect(() => parseUsdPrice("")).toThrow(/malformed/);
    expect(() => parseUsdPrice("0")).toThrow(/non-positive/);
    expect(() => parseUsdPrice("0.000000001")).toThrow(/non-positive/); // truncates to 0 at scale 8
  });
});

describe("ceilDiv", () => {
  it("rounds up", () => {
    expect(ceilDiv(10n, 3n)).toBe(4n);
    expect(ceilDiv(9n, 3n)).toBe(3n);
    expect(ceilDiv(0n, 3n)).toBe(0n);
  });
  it("rejects a non-positive denominator", () => {
    expect(() => ceilDiv(1n, 0n)).toThrow();
  });
});

describe("addBps / subBps", () => {
  it("adds basis points, rounding up", () => {
    expect(addBps(10_000n, 500)).toBe(10_500n); // +5%
    expect(addBps(1n, 1)).toBe(2n); // ceil(1 * 10001 / 10000) = ceil(1.0001) = 2
  });
  it("subtracts basis points, rounding down", () => {
    expect(subBps(10_000n, 500)).toBe(9_500n); // -5%
    expect(subBps(10_000n, 0)).toBe(10_000n);
  });
  it("rejects out-of-range bps", () => {
    expect(() => addBps(1n, -1)).toThrow();
    expect(() => subBps(1n, 10_001)).toThrow();
  });
});

describe("convertTokenAmount", () => {
  const eth = { usd: parseUsdPrice("2500"), decimals: 18 };

  it("converts ETH → USDC across decimals", () => {
    // 0.018 ETH * $2500 = $45 -> 45 USDC (6 decimals)
    expect(convertTokenAmount(18_000_000_000_000_000n, eth, { usd: parseUsdPrice("1"), decimals: 6 })).toBe(
      45_000_000n,
    );
  });

  it("converts a token to itself as the identity", () => {
    const dai = { usd: parseUsdPrice("1"), decimals: 18 };
    expect(convertTokenAmount(123_456n, dai, dai)).toBe(123_456n);
  });

  it("is invariant to the shared price scale (it cancels)", () => {
    const a = convertTokenAmount(
      1_000_000n,
      { usd: parseUsdPrice("2500"), decimals: 18 },
      { usd: parseUsdPrice("1"), decimals: 6 },
    );
    const b = convertTokenAmount(
      1_000_000n,
      { usd: parseUsdPrice("2500", 4), decimals: 18 },
      { usd: parseUsdPrice("1", 4), decimals: 6 },
    );
    expect(a).toBe(b);
  });

  it("rounds up and rejects bad inputs", () => {
    expect(convertTokenAmount(1n, eth, { usd: parseUsdPrice("1"), decimals: 6 })).toBe(1n); // tiny -> 1, not 0
    expect(() => convertTokenAmount(1n, { usd: 0n, decimals: 18 }, eth)).toThrow(/positive/);
    expect(() => convertTokenAmount(-1n, eth, eth)).toThrow(/non-negative/);
  });

  it("gasCostInToken composes from it (native wei IS a native-token amount)", () => {
    const gasUnits = 900_000n;
    const gasPriceWei = 20_000_000_000n;
    const tokenUsd = parseUsdPrice("1");
    expect(
      gasCostInToken({ gasUnits, gasPriceWei, nativeUsd: eth.usd, tokenUsd, nativeDecimals: 18, tokenDecimals: 6 }),
    ).toBe(convertTokenAmount(gasUnits * gasPriceWei, eth, { usd: tokenUsd, decimals: 6 }));
  });
});

describe("gasCostInToken", () => {
  const nativeUsd = parseUsdPrice("2500"); // ETH at $2500
  const nativeDecimals = 18;

  it("converts gas to an 18-decimal token at parity-ish price", () => {
    // gas = 900k units * 20 gwei = 0.018 ETH = $45 ; DAI at $1, 18 decimals
    const out = gasCostInToken({
      gasUnits: 900_000n,
      gasPriceWei: 20_000_000_000n, // 20 gwei
      nativeUsd,
      tokenUsd: parseUsdPrice("1"),
      nativeDecimals,
      tokenDecimals: 18,
    });
    // 0.018 ETH * $2500 = $45 -> 45 DAI -> 45 * 1e18
    expect(out).toBe(45_000_000_000_000_000_000n);
  });

  it("converts gas to a 6-decimal token (USDC)", () => {
    const out = gasCostInToken({
      gasUnits: 900_000n,
      gasPriceWei: 20_000_000_000n,
      nativeUsd,
      tokenUsd: parseUsdPrice("1"),
      nativeDecimals,
      tokenDecimals: 6,
    });
    // $45 -> 45 USDC -> 45 * 1e6
    expect(out).toBe(45_000_000n);
  });

  it("is invariant to the shared price scale (it cancels)", () => {
    const base = {
      gasUnits: 500_000n,
      gasPriceWei: 13_000_000_000n,
      nativeDecimals,
      tokenDecimals: 6,
    };
    const a = gasCostInToken({ ...base, nativeUsd: parseUsdPrice("2500"), tokenUsd: parseUsdPrice("1") });
    const b = gasCostInToken({
      ...base,
      nativeUsd: parseUsdPrice("2500", 4),
      tokenUsd: parseUsdPrice("1", 4),
    });
    expect(a).toBe(b);
  });

  it("rounds up (never under-charges the operator)", () => {
    const out = gasCostInToken({
      gasUnits: 1n,
      gasPriceWei: 1n,
      nativeUsd: parseUsdPrice("2500"),
      tokenUsd: parseUsdPrice("1"),
      nativeDecimals: 18,
      tokenDecimals: 6,
    });
    expect(out).toBe(1n); // tiny positive cost rounds up to 1 base unit, not 0
  });

  it("rejects non-positive prices", () => {
    expect(() =>
      gasCostInToken({
        gasUnits: 1n,
        gasPriceWei: 1n,
        nativeUsd: 0n,
        tokenUsd: parseUsdPrice("1"),
        nativeDecimals: 18,
        tokenDecimals: 6,
      }),
    ).toThrow(/positive/);
  });
});

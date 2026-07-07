import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeConfig, DEFAULT_TEST_PROTOCOL, fixtureNetwork } from "@/test/fixtures";
import type { Currency, Network } from "@/types";
import type { HexString } from "@/types/helper";
import { estimateExternalTransfer } from "./estimateExternalTransfer";

const getQuote = vi.hoisted(() => vi.fn());
vi.mock("@lifi/sdk", () => ({ getQuote }));

const SHIELD_USDC = "0x000000000000000000000000000000000000c0de" as HexString;
const ARB_USDC = "0x000000000000000000000000000000000000abcd" as HexString;

const currency = (overrides: Partial<Currency> = {}): Currency =>
  ({
    id: 1,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    contractAddress: SHIELD_USDC,
    nativeCurrency: false,
    ...overrides,
  }) as unknown as Currency;

/** A shielding-capable network (has aggregator config). */
const shieldingNetwork = (currencies: Currency[]): Network =>
  fixtureNetwork({
    id: 1,
    name: "Ethereum",
    chainId: "1",
    aggregatorContractAddress: "0x000000000000000000000000000000000000a991" as HexString,
    currencies,
  } as Partial<Network>);

/** A SECOND shielding-capable network (its own aggregator), for multi-aggregator tests. */
const arbitrumShielding = (currencies: Currency[]): Network =>
  fixtureNetwork({
    id: 42161,
    name: "Arbitrum",
    chainId: "42161",
    aggregatorContractAddress: "0x000000000000000000000000000000000000b992" as HexString,
    currencies,
  } as Partial<Network>);

/** Protocol-global proving config with withdrawal groupFee 10 => 1% Curvy fee. */
const PROTOCOL = {
  ...DEFAULT_TEST_PROTOCOL,
  proving: {
    ...DEFAULT_TEST_PROTOCOL.proving,
    withdrawal: { ...DEFAULT_TEST_PROTOCOL.proving.withdrawal, groupFee: 10 },
  },
};

function configWithShielding(shielding: Network) {
  return createFakeConfig({ activeNetworks: [shielding], protocol: PROTOCOL });
}

describe("estimateExternalTransfer", () => {
  beforeEach(() => {
    getQuote.mockReset();
  });

  it("throws when no shielding-capable network is active", async () => {
    const config = createFakeConfig({ activeNetworks: [fixtureNetwork()] });
    const shieldUsdc = currency();
    await expect(
      estimateExternalTransfer({
        config,
        fromNetwork: fixtureNetwork(),
        fromCurrency: shieldUsdc,
        fromAmount: 1_000_000n,
        toNetwork: fixtureNetwork(),
        toCurrency: shieldUsdc,
      }),
    ).rejects.toThrow("No shielding-capable network is active.");
  });

  it("same-network, same-currency: charges only the Curvy fee (no getQuote)", async () => {
    const shieldUsdc = currency();
    const shielding = shieldingNetwork([shieldUsdc]);
    const config = configWithShielding(shielding);

    const result = await estimateExternalTransfer({
      config,
      fromNetwork: shielding,
      fromCurrency: shieldUsdc,
      fromAmount: 1_000_000n,
      toNetwork: shielding,
      toCurrency: shieldUsdc,
    });

    // groupFee 10 => fee = 1_000_000 * 10 / 1000 = 10_000; net = 990_000.
    expect(result.fees.entryBridge).toBe(0n);
    expect(result.fees.curvy).toBe(10_000n);
    expect(result.fees.exitBridge).toBe(0n);
    expect(result.effectiveAmount).toBe(990_000n);
    expect(result.bridgedCurrency.id).toBe(shieldUsdc.id);
    expect(result.shieldingNetwork.id).toBe(shielding.id);
    expect(getQuote).not.toHaveBeenCalled();
  });

  it("bridged entry leg: quotes the entry bridge and applies the Curvy fee on the bridged amount", async () => {
    const shieldUsdc = currency({ id: 1, contractAddress: SHIELD_USDC });
    const shielding = shieldingNetwork([shieldUsdc]);
    const config = configWithShielding(shielding);

    // Source currency on a different network, bridging to shieldUsdc (id 1) on the shielding chain.
    const fromNetwork = fixtureNetwork({ id: 42161, name: "Arbitrum", chainId: "42161" });
    const fromCurrency = currency({
      id: 99,
      contractAddress: ARB_USDC,
      bridgeNetworkIdToCurrencyIdMap: { [shielding.id]: shieldUsdc.id },
    } as Partial<Currency>);

    // Entry quote: 1_000_000 in -> 980_000 bridged, 5_000 fee.
    getQuote.mockResolvedValueOnce({
      estimate: { toAmount: "980000", feeCosts: [{ amount: "5000" }] },
    });

    const result = await estimateExternalTransfer({
      config,
      fromNetwork,
      fromCurrency,
      fromAmount: 1_000_000n,
      toNetwork: shielding,
      toCurrency: shieldUsdc,
    });

    expect(getQuote).toHaveBeenCalledTimes(1);
    expect(result.fees.entryBridge).toBe(5_000n);
    // Curvy fee on the bridged 980_000 => 9_800; net = 970_200.
    expect(result.fees.curvy).toBe(9_800n);
    expect(result.fees.exitBridge).toBe(0n);
    expect(result.effectiveAmount).toBe(970_200n);
  });

  it("bridged exit leg: quotes the exit bridge for a differing destination currency", async () => {
    const shieldUsdc = currency({ id: 1, contractAddress: SHIELD_USDC });
    const shielding = shieldingNetwork([shieldUsdc]);
    const config = configWithShielding(shielding);

    const toNetwork = fixtureNetwork({ id: 42161, name: "Arbitrum", chainId: "42161" });
    const toCurrency = currency({ id: 99, symbol: "USDT", contractAddress: ARB_USDC });

    // Only the exit quote is requested (entry leg is same-network).
    getQuote.mockResolvedValueOnce({
      estimate: { toAmount: "985000", feeCosts: [{ amount: "4000" }, { amount: "1000" }] },
    });

    const result = await estimateExternalTransfer({
      config,
      fromNetwork: shielding,
      fromCurrency: shieldUsdc,
      fromAmount: 1_000_000n,
      toNetwork,
      toCurrency,
    });

    expect(getQuote).toHaveBeenCalledTimes(1);
    expect(result.fees.entryBridge).toBe(0n);
    // Curvy fee on 1_000_000 => 10_000; net after curvy = 990_000 (the exit quote's input).
    expect(result.fees.curvy).toBe(10_000n);
    expect(result.fees.exitBridge).toBe(5_000n);
    expect(result.effectiveAmount).toBe(985_000n);
  });

  it("multi-aggregator: shields on the SOURCE chain when it has its own aggregator (no entry bridge)", async () => {
    const ethUsdc = currency({ id: 1, contractAddress: SHIELD_USDC });
    const arbUsdc = currency({ id: 2, contractAddress: ARB_USDC });
    const ethereum = shieldingNetwork([ethUsdc]); // id 1 — the old find-first pick
    const arbitrum = arbitrumShielding([arbUsdc]); // id 42161 — the source, also an aggregator
    const config = createFakeConfig({ activeNetworks: [ethereum, arbitrum], protocol: PROTOCOL });

    const result = await estimateExternalTransfer({
      config,
      fromNetwork: arbitrum, // source IS an aggregator network — but NOT activeNetworks[0]
      fromCurrency: arbUsdc,
      fromAmount: 1_000_000n,
      toNetwork: arbitrum,
      toCurrency: arbUsdc,
    });

    // Old find-first picked ethereum and would have bridged; new code shields on arbitrum directly.
    expect(result.shieldingNetwork.id).toBe(arbitrum.id);
    expect(result.fees.entryBridge).toBe(0n);
    expect(getQuote).not.toHaveBeenCalled();
  });

  it("multi-aggregator: an explicit shieldingNetworkSlug overrides the default", async () => {
    const ethUsdc = currency({ id: 1, contractAddress: SHIELD_USDC });
    const arbUsdc = currency({
      id: 2,
      contractAddress: ARB_USDC,
      bridgeNetworkIdToCurrencyIdMap: { 1: ethUsdc.id },
    } as Partial<Currency>);
    const ethereum = shieldingNetwork([ethUsdc]);
    const arbitrum = arbitrumShielding([arbUsdc]);
    const config = createFakeConfig({ activeNetworks: [ethereum, arbitrum], protocol: PROTOCOL });

    // Entry bridge arbitrum→ethereum is quoted because we force shielding on ethereum.
    getQuote.mockResolvedValueOnce({ estimate: { toAmount: "980000", feeCosts: [{ amount: "5000" }] } });

    const result = await estimateExternalTransfer({
      config,
      fromNetwork: arbitrum,
      fromCurrency: arbUsdc,
      fromAmount: 1_000_000n,
      toNetwork: ethereum,
      toCurrency: ethUsdc,
      shieldingNetworkSlug: ethereum.slug,
    });

    expect(result.shieldingNetwork.id).toBe(ethereum.id);
    expect(getQuote).toHaveBeenCalledTimes(1);
    expect(result.fees.entryBridge).toBe(5_000n);
  });
});

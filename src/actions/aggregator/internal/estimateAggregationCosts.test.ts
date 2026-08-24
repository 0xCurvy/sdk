import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeeEstimateUnavailableError } from "@/errors";
import { createFakeApi, createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import { estimateAggregationCosts } from "./estimateAggregationCosts";
import { fetchAggregatorFees } from "./fetchAggregatorFees";

vi.mock("./fetchAggregatorFees", () => ({ fetchAggregatorFees: vi.fn() }));
vi.mock("@/gas", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/gas")>()),
  gasCostInToken: ({ gasUnits }: { gasUnits: bigint }) => gasUnits,
  resolveTokenPrices: () => ({
    nativeUsd: 1,
    tokenUsd: 1,
    nativeDecimals: 18,
    tokenDecimals: 18,
  }),
}));

const network = fixtureNetwork();

beforeEach(() => {
  vi.mocked(fetchAggregatorFees).mockResolvedValue({
    protocolFeePerThousand: 10n,
    feeNotePublicKey: [1n, 2n],
    commitmentGasCosts: [5n],
  });
});

describe("estimateAggregationCosts", () => {
  it("returns only the relay inputs needed by the allocation calculation", async () => {
    const api = createFakeApi({
      relay: {
        GetPaymasterInfo: vi.fn(async () => ({
          operator: { S: "1", V: "2", babyJubjubPublicKey: "3.4" },
          submitAggregationGasUnits: "100",
          gasPriceWei: "1",
          clientBufferBps: 1_000,
        })) as never,
      },
    });
    const config = createFakeConfig({ api, networks: [network] });

    const estimate = await estimateAggregationCosts({
      config,
      networkSlug: network.slug,
      token: 0n,
    });

    expect(estimate).toEqual({
      operator: { S: "1", V: "2", babyJubjubPublicKey: "3.4" },
      relayFee: 110n,
      commitmentFee: 5n,
      protocolFeePerThousand: 10n,
    });
  });

  it("does not return a relay quote when paymaster terms are unavailable", async () => {
    const api = createFakeApi({ relay: { GetPaymasterInfo: vi.fn(async () => Promise.reject(new Error("offline"))) } });
    const config = createFakeConfig({ api, networks: [network] });

    await expect(
      estimateAggregationCosts({ config, networkSlug: network.slug, token: 0n, submissionMode: "relay" }),
    ).rejects.toBeInstanceOf(FeeEstimateUnavailableError);
  });

  it("estimates direct submission without contacting the paymaster", async () => {
    const getPaymasterInfo = vi.fn(async () => Promise.reject(new Error("offline")));
    const api = createFakeApi({ relay: { GetPaymasterInfo: getPaymasterInfo } });
    const config = createFakeConfig({ api, networks: [network], submissionMode: "direct" });

    const estimate = await estimateAggregationCosts({
      config,
      networkSlug: network.slug,
      token: 0n,
    });

    expect(estimate).toEqual({
      relayFee: 0n,
      commitmentFee: 5n,
      protocolFeePerThousand: 10n,
    });
    expect(getPaymasterInfo).not.toHaveBeenCalled();
  });
});

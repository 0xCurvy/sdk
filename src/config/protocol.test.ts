import { describe, expect, it } from "vitest";
import type { ProtocolConfig } from "@/http/contracts";
import { createFakeConfig, DEFAULT_TEST_PROTOCOL, fixtureNetwork } from "@/test/fixtures";
import { getDefaultAggregatorNetwork } from "./getDefaultAggregatorNetwork";
import { getProtocol } from "./protocol";

const arbitrum = fixtureNetwork({ id: 1, slug: "arbitrum", chainId: "42161" });
const ethereum = fixtureNetwork({ id: 2, slug: "ethereum", chainId: "1" });

/** Two aggregators on different dimensions — an L2 at 10 inputs, an L1 at 2. */
const multiAggregatorProtocol: ProtocolConfig = {
  ...DEFAULT_TEST_PROTOCOL,
  provingByChainId: {
    "42161": {
      aggregation: { treeDepth: 30, maxInputs: 10, maxOutputs: 3, batchSize: 5, groupFee: 1 },
      withdrawal: { treeDepth: 30, maxInputs: 10, maxOutputs: 0, batchSize: 5, groupFee: 7 },
      noteOwnership: DEFAULT_TEST_PROTOCOL.proving.noteOwnership,
    },
    "1": DEFAULT_TEST_PROTOCOL.proving,
  },
};

describe("getProtocol", () => {
  it("returns the network's own circuit dimensions", () => {
    const config = createFakeConfig({ protocol: multiAggregatorProtocol });
    expect(getProtocol({ config, network: arbitrum }).aggregation.maxInputs).toBe(10);
    expect(getProtocol({ config, network: ethereum }).aggregation.maxInputs).toBe(2);
  });

  it("reads the group fee off the network's own withdrawal circuit", () => {
    const config = createFakeConfig({ protocol: multiAggregatorProtocol });
    expect(getProtocol({ config, network: arbitrum }).withdrawal.groupFee).toBe(7);
    expect(getProtocol({ config, network: ethereum }).withdrawal.groupFee).toBe(2);
  });

  it("falls back to the default aggregator's config for a chain with no entry", () => {
    const config = createFakeConfig({ protocol: multiAggregatorProtocol });
    const unknown = fixtureNetwork({ id: 3, slug: "base", chainId: "8453" });
    expect(getProtocol({ config, network: unknown })).toEqual(DEFAULT_TEST_PROTOCOL.proving);
  });

  // An older metadata deployment serves only the global blob; a newer SDK must
  // still work against it rather than throwing on the missing map.
  it("falls back to the global proving config when the backend sends no per-chain map", () => {
    const config = createFakeConfig({ protocol: DEFAULT_TEST_PROTOCOL });
    expect(getProtocol({ config, network: arbitrum })).toEqual(DEFAULT_TEST_PROTOCOL.proving);
  });

  it("returns the default aggregator's config when no network is given", () => {
    const config = createFakeConfig({ protocol: multiAggregatorProtocol });
    expect(getProtocol({ config })).toEqual(DEFAULT_TEST_PROTOCOL.proving);
  });

  it("throws when the protocol config has not loaded yet", () => {
    const config = createFakeConfig({ protocol: null });
    expect(() => getProtocol({ config, network: arbitrum })).toThrow(/protocol config is not loaded/);
    expect(() => getProtocol({ config })).toThrow(/protocol config is not loaded/);
  });
});

describe("getDefaultAggregatorNetwork", () => {
  const withAggregator = (over: Parameters<typeof fixtureNetwork>[0]) =>
    fixtureNetwork({ aggregatorContractAddress: "0x00000000000000000000000000000000000000A9", ...over });

  it("prefers the flagged default over registry order", () => {
    const config = createFakeConfig({
      activeNetworks: [
        withAggregator({ id: 1, slug: "ethereum", chainId: "1" }),
        withAggregator({ id: 2, slug: "arbitrum", chainId: "42161", defaultAggregator: true }),
      ],
    });
    expect(getDefaultAggregatorNetwork({ config })?.slug).toBe("arbitrum");
  });

  it("ignores networks that host no aggregator, flagged or not", () => {
    const config = createFakeConfig({
      activeNetworks: [
        fixtureNetwork({ id: 1, slug: "base", chainId: "8453" }),
        withAggregator({ id: 2, slug: "arbitrum", chainId: "42161" }),
      ],
    });
    expect(getDefaultAggregatorNetwork({ config })?.slug).toBe("arbitrum");
  });

  // Back-compat: a backend that has not seeded the flag must behave as before.
  it("falls back to the first aggregator network when nothing is flagged", () => {
    const config = createFakeConfig({
      activeNetworks: [
        withAggregator({ id: 1, slug: "ethereum", chainId: "1" }),
        withAggregator({ id: 2, slug: "arbitrum", chainId: "42161" }),
      ],
    });
    expect(getDefaultAggregatorNetwork({ config })?.slug).toBe("ethereum");
  });

  // A direct-shield-only deployment (Gnosis) carries an aggregator address but its
  // on-chain portalFactory is unset, so portalShield reverts there. It must never be
  // the network portals are routed to — the same rule the portal-broadcaster applies.
  it("ignores a direct-shield-only aggregator", () => {
    const config = createFakeConfig({
      activeNetworks: [
        withAggregator({ id: 1, slug: "gnosis", chainId: "100", portalShieldEnabled: false }),
        withAggregator({ id: 2, slug: "arbitrum", chainId: "42161" }),
      ],
    });
    expect(getDefaultAggregatorNetwork({ config })?.slug).toBe("arbitrum");
  });

  it("returns undefined when the environment has no aggregator network", () => {
    const config = createFakeConfig({ activeNetworks: [fixtureNetwork({ id: 1, slug: "base", chainId: "8453" })] });
    expect(getDefaultAggregatorNetwork({ config })).toBeUndefined();
  });
});

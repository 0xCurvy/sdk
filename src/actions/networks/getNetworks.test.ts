import { describe, expect, it } from "vitest";
import { createFakeConfig, fixtureNetworks } from "@/test/fixtures";
import { getNetworks } from "./getNetworks";

describe("getNetworks", () => {
  it("returns all networks when no filter is given", () => {
    const config = createFakeConfig({ networks: fixtureNetworks });

    const result = getNetworks({ config });

    expect(result).toHaveLength(fixtureNetworks.length);
    expect(result.map((n) => n.id).sort()).toEqual(fixtureNetworks.map((n) => n.id).sort());
  });

  it("filters to testnets with a boolean filter", () => {
    const config = createFakeConfig({ networks: fixtureNetworks });

    const result = getNetworks({ filter: true, config });

    expect(result).toHaveLength(1);
    expect(result[0]?.testnet).toBe(true);
    expect(result[0]?.name).toBe("Ethereum Sepolia");
  });

  it("filters to mainnets with a boolean filter", () => {
    const config = createFakeConfig({ networks: fixtureNetworks });

    const result = getNetworks({ filter: false, config });

    expect(result).toHaveLength(1);
    expect(result[0]?.testnet).toBe(false);
    expect(result[0]?.name).toBe("Ethereum");
  });

  it("filters by slug", () => {
    const config = createFakeConfig({ networks: fixtureNetworks });

    const result = getNetworks({ filter: "ethereum-sepolia", config });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(11155111);
  });
});

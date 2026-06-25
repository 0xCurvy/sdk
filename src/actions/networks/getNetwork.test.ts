import { describe, expect, it } from "vitest";
import { createFakeConfig, fixtureNetworks } from "@/test/fixtures";
import { getNetwork } from "./getNetwork";

describe("getNetwork", () => {
  it("returns the single matching network", () => {
    const config = createFakeConfig({ networks: fixtureNetworks });

    const network = getNetwork({ filter: "ethereum", config });

    expect(network.id).toBe(1);
    expect(network.name).toBe("Ethereum");
  });

  it("returns the single matching network when filtering by id", () => {
    const config = createFakeConfig({ networks: fixtureNetworks });

    const network = getNetwork({ filter: 11155111, config });

    expect(network.name).toBe("Ethereum Sepolia");
  });

  it("throws when no network matches", () => {
    const config = createFakeConfig({ networks: fixtureNetworks });

    expect(() => getNetwork({ filter: "does-not-exist", config })).toThrowError(
      /Expected exactly one, but no network found/,
    );
  });

  it("throws when more than one network matches", () => {
    const config = createFakeConfig({ networks: fixtureNetworks });

    // No filter matches all (2) networks.
    expect(() => getNetwork({ config })).toThrowError(/Expected exactly one, but more than one network found/);
  });
});

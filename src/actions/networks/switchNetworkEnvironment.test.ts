import { describe, expect, it } from "vitest";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { createFakeConfig, fixtureNetworks } from "@/test/fixtures";
import { switchNetworkEnvironment } from "./switchNetworkEnvironment";

describe("switchNetworkEnvironment", () => {
  it("toggles from mainnet to testnet and updates active networks", async () => {
    const config = createFakeConfig({
      networks: fixtureNetworks,
      environment: NETWORK_ENVIRONMENT.MAINNET,
    });

    const result = await switchNetworkEnvironment({ config });

    expect(result).toBe(NETWORK_ENVIRONMENT.TESTNET);
    expect(config.state.environment).toBe(NETWORK_ENVIRONMENT.TESTNET);
    expect(config.state.activeNetworks).toHaveLength(1);
    expect(config.state.activeNetworks[0]?.testnet).toBe(true);
  });

  it("toggles from testnet back to mainnet", async () => {
    const config = createFakeConfig({
      networks: fixtureNetworks,
      environment: NETWORK_ENVIRONMENT.TESTNET,
    });

    const result = await switchNetworkEnvironment({ config });

    expect(result).toBe(NETWORK_ENVIRONMENT.MAINNET);
    expect(config.state.environment).toBe(NETWORK_ENVIRONMENT.MAINNET);
    expect(config.state.activeNetworks.every((n) => !n.testnet)).toBe(true);
  });

  it("switches to an explicitly requested environment", async () => {
    const config = createFakeConfig({
      networks: fixtureNetworks,
      environment: NETWORK_ENVIRONMENT.MAINNET,
    });

    const result = await switchNetworkEnvironment({ environment: "testnet", config });

    expect(result).toBe(NETWORK_ENVIRONMENT.TESTNET);
    expect(config.state.environment).toBe(NETWORK_ENVIRONMENT.TESTNET);
  });

  it("throws when no networks exist for the target environment", async () => {
    // Only a mainnet network — switching to testnet yields an empty set.
    const config = createFakeConfig({
      networks: [fixtureNetworks[0]],
      environment: NETWORK_ENVIRONMENT.MAINNET,
    });

    await expect(switchNetworkEnvironment({ environment: "testnet", config })).rejects.toThrowError(
      /Network array is empty after filtering/,
    );
  });
});

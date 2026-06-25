import { describe, expect, it, vi } from "vitest";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { createFakeConfig, fixtureNetworks } from "@/test/fixtures";
import { switchNetworkEnvironment } from "./switchNetworkEnvironment";
import { watchEnvironment } from "./watchEnvironment";

describe("watchEnvironment", () => {
  it("fires the listener when the environment changes", async () => {
    const config = createFakeConfig({
      networks: fixtureNetworks,
      environment: NETWORK_ENVIRONMENT.MAINNET,
    });

    const onChange = vi.fn();
    watchEnvironment({ onChange, config });

    await switchNetworkEnvironment({ config });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(NETWORK_ENVIRONMENT.TESTNET);
  });

  it("does not fire when the environment is unchanged", () => {
    const config = createFakeConfig({
      networks: fixtureNetworks,
      environment: NETWORK_ENVIRONMENT.MAINNET,
    });

    const onChange = vi.fn();
    watchEnvironment({ onChange, config });

    // Updating an unrelated slice should not trigger the environment listener.
    config.setState({ activeAccountId: "account-a" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("stops firing after unsubscribe", async () => {
    const config = createFakeConfig({
      networks: fixtureNetworks,
      environment: NETWORK_ENVIRONMENT.MAINNET,
    });

    const onChange = vi.fn();
    const unsubscribe = watchEnvironment({ onChange, config });
    unsubscribe();

    await switchNetworkEnvironment({ config });

    expect(onChange).not.toHaveBeenCalled();
  });
});

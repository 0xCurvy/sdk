import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NETWORK_ENVIRONMENT, type NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { invariant } from "@/utils/invariant";
import { filterNetworks } from "@/utils/network";

export type SwitchNetworkEnvironmentParameters = WithConfig<{
  /** Target environment. When omitted, toggles the current environment. */
  environment?: "mainnet" | "testnet";
}>;

/**
 * Switch the active network environment, recomputing the active network set.
 *
 * When `environment` is omitted the current environment is toggled. The RPC
 * client is rebuilt lazily by `config.getRpc` per environment, so no transport
 * is touched here — only reactive state is updated.
 *
 * @example
 * await switchNetworkEnvironment();                          // toggle
 * await switchNetworkEnvironment({ environment: "testnet" });
 *
 * @throws when no networks match the target environment after filtering.
 * @throws when the filtered networks mix mainnet and testnet.
 */
export async function switchNetworkEnvironment(
  parameters: SwitchNetworkEnvironmentParameters = {},
): Promise<NETWORK_ENVIRONMENT_VALUES> {
  const config = resolveConfig(parameters.config);

  // If mainnet, toggle to testnet (true)
  const isTestnet = parameters.environment
    ? parameters.environment === "testnet"
    : config.state.environment === "mainnet";

  const networks = filterNetworks(config.state.networks, isTestnet);

  const uniqueEnvironmentSet = new Set(networks.map((n) => n.testnet));
  invariant(uniqueEnvironmentSet.size <= 1, "Cannot mix mainnet and testnet networks!");

  invariant(networks.length, `Network array is empty after filtering with ${isTestnet}`);

  const environment = uniqueEnvironmentSet.values().next().value;

  invariant(environment !== undefined, "No environment set.");

  const nextEnvironment = environment ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET;

  config.setState({
    environment: nextEnvironment,
    activeNetworks: networks,
  });

  return nextEnvironment;
}

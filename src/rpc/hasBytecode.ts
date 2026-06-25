import type { CurvyConfig } from "@/config/types";
import type { Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import type { CurvyPublicClient } from "./types";

/**
 * Functional port of the legacy `hasBytecode(sdk, network, address)` helper.
 *
 * Resolves the network's RPC provider from the `config` and checks whether the
 * given address has any deployed bytecode (i.e. is a contract). Used as a
 * wait-condition in `generatePlan` to detect when the broadcaster has deployed
 * an exit/shield portal contract.
 *
 * @example
 * const deployed = await hasBytecode(config, network, "0xabc...");
 */
export async function hasBytecode(config: CurvyConfig, network: Network, address: HexString): Promise<boolean> {
  const client = config.getRpc().Network(network.id).provider as CurvyPublicClient;

  const bytecode = await client.getCode({ address });
  return !!bytecode && bytecode !== "0x";
}

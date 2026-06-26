import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import type { CurvyPublicClient } from "./types";

export type HasBytecodeParameters = WithConfig<{
  network: Network;
  address: HexString;
}>;

/**
 * Functional port of the legacy `hasBytecode(sdk, network, address)` helper.
 *
 * Resolves the network's RPC provider from the config and checks whether the
 * given address has any deployed bytecode (i.e. is a contract). Used as a
 * wait-condition in `generatePlan` to detect when the broadcaster has deployed
 * an exit/shield portal contract.
 *
 * Follows the standard action convention: `config` is optional and defaults to
 * the ambient global, so callers can simply do `hasBytecode({ network, address })`.
 *
 * @example
 * const deployed = await hasBytecode({ network, address: "0xabc..." });
 */
export async function hasBytecode(parameters: HasBytecodeParameters): Promise<boolean> {
  const config = resolveConfig(parameters.config);
  const { network, address } = parameters;

  const client = config.getRpc().Network(network.id).provider as CurvyPublicClient;

  const bytecode = await client.getCode({ address });
  return !!bytecode && bytecode !== "0x";
}

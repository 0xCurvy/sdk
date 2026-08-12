import type { Chain, HttpTransport, PublicClient } from "viem";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { Network } from "@/http/contracts";
import type { HexString } from "@/types/helper";

export type HasBytecodeParameters = WithConfig<{
  network: Network;
  address: HexString;
}>;

/**
 * Return whether an address has deployed contract bytecode on `network`.
 *
 * @example
 * const deployed = await hasBytecode({ network, address });
 */
export async function hasBytecode(parameters: HasBytecodeParameters): Promise<boolean> {
  const config = resolveConfig(parameters.config);
  const { network, address } = parameters;

  const client = config.getRpc().Network(network.id).provider as PublicClient<HttpTransport, Chain>;

  const bytecode = await client.getCode({ address });
  return !!bytecode && bytecode !== "0x";
}

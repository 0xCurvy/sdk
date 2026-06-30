import { type Chain, defineChain } from "viem";
import * as viemChains from "viem/chains";
import type { HexString } from "@/types";
import type { Network } from "@/types/api";

// Every curated viem chain definition, indexed by numeric chain id. These carry the
// behavioral truth a bare `defineChain` would drop: accurate native currency, the
// canonical multicall3 address, explorer apiUrls, ENS contracts, and (critically) the
// per-chain `formatters`/`serializers`/`fees` viem ships for OP-stack / zkSync / Celo / etc.
const CURATED_CHAINS: Map<number, Chain> = new Map(
  Object.values(viemChains as Record<string, unknown>)
    .filter((c): c is Chain => typeof c === "object" && c !== null && typeof (c as Chain).id === "number")
    .map((c) => [c.id, c]),
);

export type ToViemChainOptions = {
  /** RPC endpoint for the chain's default transport. Defaults to `network.rpcUrl`. */
  rpcUrl?: string;
};

/**
 * Project a Curvy `Network` (EVM) into a viem `Chain`.
 *
 * Hybrid by design: the curated `viem/chains` definition (looked up by `chainId`) is the
 * BASE — so chain *behavior* is correct — and our metadata is overlaid on top: the RPC URL,
 * the multicall3 address, and the testnet flag. For chains viem doesn't know (localnet/anvil
 * or a brand-new chain) it falls back to a full `defineChain` synthesized from the metadata,
 * with the native currency taken from the network's native `Currency` row (no hardcoded
 * per-name table). Solana networks have no viem `Chain` — pass EVM networks only.
 */
export function toViemChain(network: Network, options: ToViemChainOptions = {}): Chain {
  const id = Number(network.chainId);
  const rpcUrl = options.rpcUrl ?? network.rpcUrl;
  const multicall3 = network.multiCallContractAddress
    ? { multicall3: { address: network.multiCallContractAddress as HexString } }
    : {};

  const base = CURATED_CHAINS.get(id);
  if (base) {
    return {
      ...base,
      rpcUrls: { default: { http: [rpcUrl] } },
      contracts: { ...base.contracts, ...multicall3 },
      testnet: network.testnet,
    };
  }

  // Unknown chain — synthesize from metadata. Native currency must be present.
  const native = network.currencies.find((c) => c.nativeCurrency);
  if (!native) {
    throw new Error(
      `toViemChain: network "${network.name}" (chainId ${id}) has no native currency and is not a known viem chain`,
    );
  }
  return defineChain({
    id,
    name: network.name,
    nativeCurrency: { name: native.name, symbol: native.symbol, decimals: native.decimals },
    rpcUrls: { default: { http: [rpcUrl] } },
    ...(network.blockExplorerUrl
      ? { blockExplorers: { default: { name: `${network.name} explorer`, url: network.blockExplorerUrl } } }
      : {}),
    ...(network.multiCallContractAddress ? { contracts: multicall3 } : {}),
    testnet: network.testnet,
  });
}

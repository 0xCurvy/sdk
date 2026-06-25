import type { Address } from "viem";
import type { CurvyConfig } from "@/config/types";
import { aggregatorAlphaV2Abi } from "@/contracts/evm/abi";
import { MissingContractAddressError } from "@/errors";
import type { EvmRpc } from "@/rpc/evm";

/**
 * Read the aggregator's live fee config (`protocolFeePerThousand`, `gasFee`, and the
 * `feeNotePublicKey`) from the contract. These are NOT caller parameters: the
 * aggregation circuit emits them as public signals and the contract reverts
 * `FeeMismatch()` / `FeeNotePublicKeyMismatch()` unless they equal the on-chain
 * values — so the builders fetch them here to guarantee a match.
 */
export async function fetchAggregatorFees(
  config: CurvyConfig,
  networkSlug: string,
): Promise<{ protocolFeePerThousand: bigint; gasFee: bigint; feeNotePublicKey: [bigint, bigint] }> {
  const network = config.state.networks.find((n) => n.slug === networkSlug);
  if (!network) throw new Error(`fetchAggregatorFees: unknown network "${networkSlug}"`);
  if (!network.aggregatorContractAddress) {
    throw new MissingContractAddressError(`network "${networkSlug}" has no aggregatorContractAddress`);
  }

  const rpc = config.getRpc().Network(network.id) as EvmRpc;
  const address = network.aggregatorContractAddress as Address;
  const [protocolFeePerThousand, gasFee, feeKeyX, feeKeyY] = await Promise.all([
    rpc.provider.readContract({ address, abi: aggregatorAlphaV2Abi, functionName: "protocolFeePerThousand" }),
    rpc.provider.readContract({ address, abi: aggregatorAlphaV2Abi, functionName: "gasFee" }),
    rpc.provider.readContract({ address, abi: aggregatorAlphaV2Abi, functionName: "feeNotePublicKey", args: [0n] }),
    rpc.provider.readContract({ address, abi: aggregatorAlphaV2Abi, functionName: "feeNotePublicKey", args: [1n] }),
  ]);
  return {
    protocolFeePerThousand: protocolFeePerThousand as bigint,
    gasFee: gasFee as bigint,
    feeNotePublicKey: [feeKeyX as bigint, feeKeyY as bigint],
  };
}

import type { Address } from "viem";
import type { CurvyConfig } from "@/config/types";
import { aggregatorAlphaV2Abi, vaultV2Abi } from "@/contracts/evm/abi";
import { MissingContractAddressError } from "@/errors";
import { GAS_FEE_TREE_DEPTH } from "@/proving";
import type { EvmRpc } from "@/rpc/evm";

/**
 * Read the aggregator's live fee config. These are NOT caller parameters: the aggregation
 * circuit binds them and the contract reverts unless they match — so the builders fetch them
 * here to guarantee a match.
 *
 * The per-token gas-fee table is no longer stored enumerably on-chain. The vault re-emits the
 * COMPLETE table (one cost per gas-fee-tree leaf) on every `setCommitmentGasFee`, and records the
 * block in `latestCommitmentGasCostUpdateBlock`. We reconstruct the full leaf set from that single
 * event — no historical replay — then the builder rebuilds the depth-`GAS_FEE_TREE_DEPTH` tree and
 * proves the inputs' token's leaf under the aggregator's `commitmentFeeRoot`.
 */
export async function fetchAggregatorFees(
  config: CurvyConfig,
  networkSlug: string,
): Promise<{
  protocolFeePerThousand: bigint;
  feeNotePublicKey: [bigint, bigint];
  commitmentFeeRoot: bigint;
  commitmentGasCosts: bigint[];
}> {
  const network = config.state.networks.find((n) => n.slug === networkSlug);
  if (!network) throw new Error(`fetchAggregatorFees: unknown network "${networkSlug}"`);
  if (!network.aggregatorContractAddress) {
    throw new MissingContractAddressError(`network "${networkSlug}" has no aggregatorContractAddress`);
  }
  if (!network.vaultContractAddress) {
    throw new MissingContractAddressError(`network "${networkSlug}" has no vaultContractAddress`);
  }

  const rpc = config.getRpc().Network(network.id) as EvmRpc;
  const aggregator = network.aggregatorContractAddress as Address;
  const vault = network.vaultContractAddress as Address;

  const [protocolFeePerThousand, feeKeyX, feeKeyY, commitmentFeeRoot, latestBlock] = await Promise.all([
    rpc.provider.readContract({
      address: aggregator,
      abi: aggregatorAlphaV2Abi,
      functionName: "protocolFeePerThousand",
    }),
    rpc.provider.readContract({
      address: aggregator,
      abi: aggregatorAlphaV2Abi,
      functionName: "feeNotePublicKey",
      args: [0n],
    }),
    rpc.provider.readContract({
      address: aggregator,
      abi: aggregatorAlphaV2Abi,
      functionName: "feeNotePublicKey",
      args: [1n],
    }),
    rpc.provider.readContract({ address: aggregator, abi: aggregatorAlphaV2Abi, functionName: "commitmentFeeRoot" }),
    rpc.provider.readContract({ address: vault, abi: vaultV2Abi, functionName: "latestCommitmentGasCostUpdateBlock" }),
  ]);

  // Full leaf set of the depth-GAS_FEE_TREE_DEPTH tree, default 0 for unset slots.
  const commitmentGasCosts = new Array<bigint>(1 << GAS_FEE_TREE_DEPTH).fill(0n);
  const block = latestBlock as bigint;
  if (block > 0n) {
    const logs = await rpc.provider.getContractEvents({
      address: vault,
      abi: vaultV2Abi,
      eventName: "CommitmentGasCostsUpdated",
      fromBlock: block,
      toBlock: block,
    });
    // The latest update at this block carries the complete table; take the last matching log.
    const latest = logs[logs.length - 1];
    const args = latest?.args as { tokenIds?: readonly bigint[]; costs?: readonly bigint[] } | undefined;
    if (args?.tokenIds && args.costs) {
      for (let i = 0; i < args.tokenIds.length; i += 1) {
        const idx = Number(args.tokenIds[i]);
        if (idx >= 0 && idx < commitmentGasCosts.length) commitmentGasCosts[idx] = BigInt(args.costs[i]);
      }
    }
  }

  return {
    protocolFeePerThousand: protocolFeePerThousand as bigint,
    feeNotePublicKey: [feeKeyX as bigint, feeKeyY as bigint],
    commitmentFeeRoot: commitmentFeeRoot as bigint,
    commitmentGasCosts,
  };
}

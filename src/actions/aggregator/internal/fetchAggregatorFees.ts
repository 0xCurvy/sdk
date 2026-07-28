import type { Address } from "viem";
import type { CurvyConfig } from "@/config/types";
import { aggregatorAlphaV2Abi, vaultV2Abi } from "@/contracts/evm/abi";
import { MissingContractAddressError } from "@/errors";
import { GAS_FEE_TREE_DEPTH, MerkleTree } from "@/proving";
import type { EvmRpc } from "@/rpc/evm";

/**
 * Read one block-pinned snapshot of the aggregator's live fee config. These are
 * NOT caller parameters: the aggregation circuit binds them and the contract
 * reverts unless they match.
 *
 * Read the enumerable vault getters rather than `gasFeeUpdateBlock`: on
 * Arbitrum, Solidity `block.number` is not the L2 RPC block number required by
 * `eth_getLogs`. The aggregation tree commits only
 * `GasFees.pendingNoteCommitment`; deposit and withdrawal use the other fields.
 */
export async function fetchAggregatorFees(
  config: CurvyConfig,
  networkSlug: string,
): Promise<{
  protocolFeePerThousand: bigint;
  feeNotePublicKey: [bigint, bigint];
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

  const blockNumber = await rpc.provider.getBlockNumber();
  const [protocolFeePerThousand, feeKeyX, feeKeyY, commitmentFeeRoot, numberOfTokens] = await rpc.provider.multicall({
    allowFailure: false,
    blockNumber,
    contracts: [
      {
        address: aggregator,
        abi: aggregatorAlphaV2Abi,
        functionName: "protocolFeePerThousand",
      },
      {
        address: aggregator,
        abi: aggregatorAlphaV2Abi,
        functionName: "feeNotePublicKey",
        args: [0n],
      },
      {
        address: aggregator,
        abi: aggregatorAlphaV2Abi,
        functionName: "feeNotePublicKey",
        args: [1n],
      },
      {
        address: aggregator,
        abi: aggregatorAlphaV2Abi,
        functionName: "commitmentFeeRoot",
      },
      {
        address: vault,
        abi: vaultV2Abi,
        functionName: "getNumberOfTokens",
      },
    ],
  });

  // Full leaf set of the depth-GAS_FEE_TREE_DEPTH tree, default 0 for unset slots.
  const capacity = 1 << GAS_FEE_TREE_DEPTH;
  if (numberOfTokens < 0n || numberOfTokens >= BigInt(capacity)) {
    throw new Error(
      `fetchAggregatorFees: vault token count ${numberOfTokens} exceeds gas-fee tree capacity ${capacity - 1}`,
    );
  }
  const tokenCount = Number(numberOfTokens);
  const gasFees = (await rpc.provider.multicall({
    allowFailure: false,
    blockNumber,
    contracts: Array.from({ length: tokenCount }, (_, index) => ({
      address: vault,
      abi: vaultV2Abi,
      functionName: "perTokenGasFees" as const,
      args: [BigInt(index + 1)] as const,
    })),
  })) as readonly { tokenId: bigint; pendingNoteCommitment: bigint }[];

  const commitmentGasCosts = new Array<bigint>(capacity).fill(0n);
  for (const [index, gasFee] of gasFees.entries()) {
    const expectedTokenId = BigInt(index + 1);
    if (gasFee.tokenId !== expectedTokenId) {
      throw new Error(
        `fetchAggregatorFees: vault returned token ${gasFee.tokenId} for requested token ${expectedTokenId}`,
      );
    }
    commitmentGasCosts[index + 1] = gasFee.pendingNoteCommitment;
  }

  const rebuiltRoot = MerkleTree.fromOrderedLeaves({ depth: GAS_FEE_TREE_DEPTH }, commitmentGasCosts).root();
  if (rebuiltRoot !== commitmentFeeRoot) {
    throw new Error(
      `fetchAggregatorFees: gas-fee table root ${rebuiltRoot} does not match on-chain root ${commitmentFeeRoot} at block ${blockNumber}`,
    );
  }

  return {
    protocolFeePerThousand,
    feeNotePublicKey: [feeKeyX, feeKeyY],
    commitmentGasCosts,
  };
}

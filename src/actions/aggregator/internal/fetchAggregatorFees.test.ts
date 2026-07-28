import { describe, expect, it, vi } from "vitest";
import { GAS_FEE_TREE_DEPTH, MerkleTree } from "@/proving";
import type { MultiRpc } from "@/rpc/multi";
import { createFakeConfig, fixtureNetwork } from "@/test/fixtures";
import { fetchAggregatorFees } from "./fetchAggregatorFees";

const AGGREGATOR = "0x00000000000000000000000000000000000000a1";
const VAULT = "0x00000000000000000000000000000000000000b1";
const BLOCK_NUMBER = 488_580_098n;
const TOKEN_FEES = [7n, 11n];

function gasFeeTable(): bigint[] {
  const costs = new Array<bigint>(1 << GAS_FEE_TREE_DEPTH).fill(0n);
  for (const [index, fee] of TOKEN_FEES.entries()) costs[index + 1] = fee;
  return costs;
}

function buildConfig(root = MerkleTree.fromOrderedLeaves({ depth: GAS_FEE_TREE_DEPTH }, gasFeeTable()).root()) {
  const getBlockNumber = vi.fn(async () => BLOCK_NUMBER);
  const multicall = vi
    .fn()
    .mockResolvedValueOnce([3n, 101n, 202n, root, BigInt(TOKEN_FEES.length)])
    .mockResolvedValueOnce(
      TOKEN_FEES.map((pendingNoteCommitment, index) => ({
        tokenId: BigInt(index + 1),
        portalDeployment: 0n,
        pendingNoteCommitment,
        withdrawal: 0n,
      })),
    );
  const rpc = {
    Network: vi.fn(() => ({ provider: { getBlockNumber, multicall } })),
  } as unknown as MultiRpc;
  const network = fixtureNetwork({
    aggregatorContractAddress: AGGREGATOR,
    vaultContractAddress: VAULT,
  });
  return {
    config: createFakeConfig({ rpc, networks: [network] }),
    getBlockNumber,
    multicall,
  };
}

describe("fetchAggregatorFees", () => {
  it("rebuilds and validates the gas-fee tree from block-pinned vault getters", async () => {
    const { config, getBlockNumber, multicall } = buildConfig();

    const fees = await fetchAggregatorFees(config, "ethereum");

    expect(fees).toEqual({
      protocolFeePerThousand: 3n,
      feeNotePublicKey: [101n, 202n],
      commitmentGasCosts: gasFeeTable(),
    });
    expect(getBlockNumber).toHaveBeenCalledOnce();
    expect(multicall).toHaveBeenCalledTimes(2);
    expect(multicall.mock.calls[0][0]).toMatchObject({
      allowFailure: false,
      blockNumber: BLOCK_NUMBER,
      contracts: [
        { address: AGGREGATOR, functionName: "protocolFeePerThousand" },
        { address: AGGREGATOR, functionName: "feeNotePublicKey", args: [0n] },
        { address: AGGREGATOR, functionName: "feeNotePublicKey", args: [1n] },
        { address: AGGREGATOR, functionName: "commitmentFeeRoot" },
        { address: VAULT, functionName: "getNumberOfTokens" },
      ],
    });
    expect(multicall.mock.calls[1][0]).toMatchObject({
      allowFailure: false,
      blockNumber: BLOCK_NUMBER,
      contracts: [
        { address: VAULT, functionName: "perTokenGasFees", args: [1n] },
        { address: VAULT, functionName: "perTokenGasFees", args: [2n] },
      ],
    });
  });

  it("fails before proving when the vault table does not match the aggregator root", async () => {
    const { config } = buildConfig(123n);

    await expect(fetchAggregatorFees(config, "ethereum")).rejects.toThrow(
      /gas-fee table root .* does not match on-chain root 123/,
    );
  });
});

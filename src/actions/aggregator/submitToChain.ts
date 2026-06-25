import type { Abi, Address, WalletClient } from "viem";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { aggregatorAlphaV2Abi } from "@/contracts/evm/abi";
import { AggregatorSubmitError, MissingContractAddressError } from "@/errors";
import type { EvmRpc } from "@/rpc/evm";
import type { HexString } from "@/types/helper";
import type { AggregatorSubmission, ChainSubmitResult } from "./types";

export type SubmitToChainParameters = WithConfig<{
  /** A built submission from one of the `build*Request` actions. */
  request: AggregatorSubmission;
  /** The user's viem wallet client — its account is the tx sender and pays gas. */
  walletClient: WalletClient;
  /** Override the target aggregator contract; defaults to the Network record's address. */
  contractAddress?: HexString;
}>;

/**
 * Submit a built aggregator proof ON-CHAIN using the user's own wallet client.
 *
 * The user is the transaction sender and pays the gas (aggregator submit is
 * permissionless — the on-chain verifier is the gate). This is the logic that used
 * to live in the devenv test flows (simulate -> writeContract -> waitForReceipt),
 * now owned by the SDK so any consumer gets it for free.
 */
export async function submitToChain(parameters: SubmitToChainParameters): Promise<ChainSubmitResult> {
  const { request, walletClient } = parameters;
  const config = resolveConfig(parameters.config);

  if (!walletClient.account) {
    throw new AggregatorSubmitError("submitToChain: walletClient has no account to send from");
  }

  const network = config.state.networks.find((n) => n.slug === request.networkSlug);
  if (!network) throw new AggregatorSubmitError(`submitToChain: unknown network "${request.networkSlug}"`);

  const rpc = config.getRpc().Network(network.id) as EvmRpc;
  const { proofA, proofB, proofC } = request.proof;

  // Resolve the target contract + the exact call per action. `abi` is widened to
  // viem's loose `Abi` so the dynamic functionName/args type-check.
  const resolved = parameters.contractAddress ?? (network.aggregatorContractAddress as HexString | undefined);
  if (!resolved) {
    throw new MissingContractAddressError(`network "${network.slug}" has no aggregatorContractAddress`);
  }
  const address: Address = resolved as Address;
  const abi: Abi = aggregatorAlphaV2Abi;
  const functionName = request.action === "withdrawal" ? "submitWithdrawalRequest" : "submitAggregationRequest";
  const args: readonly unknown[] = [BigInt(request.contractArg), proofA, proofB, proofC, request.publicSignals];

  try {
    // Simulate against the public client (catches reverts with a decoded reason),
    // then send with the user's wallet client.
    const { request: simulated } = await rpc.provider.simulateContract({
      account: walletClient.account,
      address,
      abi,
      functionName,
      args,
    });
    const transactionHash = (await walletClient.writeContract(simulated)) as HexString;
    const receipt = await rpc.provider.waitForTransactionReceipt({ hash: transactionHash });
    if (receipt.status !== "success") {
      throw new AggregatorSubmitError(`${functionName} reverted on-chain (tx ${transactionHash})`);
    }
    return { transactionHash, receipt };
  } catch (error) {
    if (error instanceof AggregatorSubmitError) throw error;
    throw new AggregatorSubmitError(`${functionName} failed: ${(error as Error).message}`, error as Error);
  }
}

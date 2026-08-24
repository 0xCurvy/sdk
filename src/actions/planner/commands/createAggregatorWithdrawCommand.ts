import { getQuote } from "@lifi/sdk";
import { buildWithdrawRequest } from "@/actions/aggregator/buildWithdrawRequest";
import { runSubmittedCommand } from "@/actions/planner/internal/runSubmittedCommand";
import { resolveInputFinalityPolicy } from "@/actions/planner/resolveInputFinalityPolicy";
import { getProtocol } from "@/config/protocol";
import { vaultV2Abi } from "@/contracts/evm/abi";
import { FeeEstimateUnavailableError, RouteUnavailableError } from "@/errors";
import type { DeliveredPlanValue, ExternalTransferIntent, SwapIntent } from "@/planner/types";
import type { EvmRpc } from "@/rpc/evm";
import { type HexString, isHexString } from "@/types";
import { invariant } from "@/utils/invariant";
import { LIFI_BRIDGES_EVM } from "../constants";
import { bridgeFeeInInputCurrency } from "./bridgeFeeInInputCurrency";
import { normalizeCommandNotes } from "./normalizeCommandNotes";
import type { Command, CommandContext, CommandEstimate } from "./types";

/**
 * Estimate and execute a withdrawal to an EVM destination. The command proves
 * locally, relays the proof, and reports the amount delivered outside Curvy.
 */
export function createAggregatorWithdrawCommand(ctx: CommandContext): Command {
  const { network, config, networkSlug, ownerBjjPrivateKeyHex } = ctx;
  // The withdraw command always has an intent (enforced by `createCommand`).
  invariant(
    ctx.intent?.type === "external-transfer" || ctx.intent?.type === "curvy-swap",
    "Withdraw commands require an external-transfer or curvy-swap intent.",
  );
  const intent: ExternalTransferIntent | SwapIntent = ctx.intent;

  // --- AbstractAggregatorCommand: validate + normalize input to an array. ---
  const { input, inputNotes, grossAmount } = normalizeCommandNotes(ctx.input);

  const finalityPolicy = () =>
    resolveInputFinalityPolicy({
      config,
      accountId: config.state.activeAccountId ?? undefined,
      networkSlug,
      intent,
    });

  let estimate = ctx.estimate;

  // --- CurvyCommand.recipient (withdraw: must be a hex address) ---
  const getRecipient = (): HexString => {
    invariant(isHexString(intent.recipient), "Withdraw command recipient must be a hex string address");
    return intent.recipient;
  };

  // --- CurvyCommand.netAmount ---
  const netAmount = (): bigint => {
    invariant(estimate, "Command not estimated.");
    const { curvyFeeInCurrency, gasFeeInCurrency } = estimate;
    return grossAmount - curvyFeeInCurrency - gasFeeInCurrency;
  };

  const estimateFees = async (): Promise<CommandEstimate> => {
    // The vault deducts this token-denominated amount from every withdrawal.
    // With relay submission it reimburses the relayer; with direct submission
    // it is paid to the transaction sender. Either way it reduces delivery.
    const vault = network.vaultContractAddress;
    if (!vault) {
      throw new FeeEstimateUnavailableError(`Network "${networkSlug}" does not advertise a vault contract.`);
    }
    let gasFeeInCurrency: bigint;
    try {
      const rpc = config.getRpc().Network(networkSlug) as EvmRpc;
      const fees = await rpc.provider.readContract({
        address: vault as HexString,
        abi: vaultV2Abi,
        functionName: "perTokenGasFees",
        args: [BigInt(input[0].vaultTokenId)],
      });
      gasFeeInCurrency = (fees as { withdrawal: bigint }).withdrawal;
    } catch (error) {
      throw new FeeEstimateUnavailableError("Could not read the current on-chain withdrawal fee.", { cause: error });
    }

    // The group fee is a property of the withdrawal circuit this network's
    // aggregator runs, so read it off that deployment.
    const curvyFeeInCurrency = (grossAmount * BigInt(getProtocol({ config, network }).withdrawal.groupFee)) / 1000n;
    const deliveredAmount = grossAmount - curvyFeeInCurrency - gasFeeInCurrency;
    estimate = {
      curvyFeeInCurrency,
      gasFeeInCurrency,
      deliveredAmount,
      degradedToFeesOnAmount: deliveredAmount < intent.amount,
      totalFeeInCurrency: curvyFeeInCurrency + gasFeeInCurrency,
    };

    // Portal delivery can bridge, swap currency, or do both.
    if (intent.type === "external-transfer" && (intent.exitNetwork || intent.exitCurrency)) {
      const { currency: inputCurrency, exitNetwork, exitCurrency } = intent;
      const targetNetwork = exitNetwork ?? intent.network;
      invariant(intent.exitAddress, "Portal delivery requires the final recipient address.");

      // Prefer an explicit exitCurrency (cross-chain swap path); otherwise resolve
      // the matching currency on the exit network via the input currency's bridge
      // map (same-currency bridge).
      const exitNetworkCurrencyAddress =
        exitCurrency?.contractAddress ??
        targetNetwork.currencies.find(
          (currency) => currency.id === inputCurrency.bridgeNetworkIdToCurrencyIdMap?.[targetNetwork.id],
        )?.contractAddress;

      if (!exitNetworkCurrencyAddress) {
        throw new RouteUnavailableError("The destination network does not support the requested currency.");
      }

      const quote = await getQuote({
        fromAddress: getRecipient(),
        toAddress: intent.exitAddress,
        fromChain: intent.network.chainId,
        toChain: targetNetwork.chainId,
        fromToken: intent.currency.contractAddress,
        toToken: exitNetworkCurrencyAddress,
        fromAmount: netAmount().toString(),
        allowBridges: LIFI_BRIDGES_EVM,
      });

      estimate.bridgeFeeInCurrency = bridgeFeeInInputCurrency(quote);
      estimate.totalFeeInCurrency = curvyFeeInCurrency + gasFeeInCurrency + estimate.bridgeFeeInCurrency;
      estimate.bridgeEstimateAmount = quote.estimate.toAmount;
    }

    // Curvy swap => calculate bridge fee and estimate amount.
    if (intent.type === "curvy-swap") {
      const quote = await getQuote({
        fromAddress: getRecipient(),
        fromChain: network.chainId,
        toChain: network.chainId,
        fromToken: intent.currency.contractAddress,
        toToken: intent.exitCurrency.contractAddress,
        fromAmount: netAmount().toString(),
        allowBridges: LIFI_BRIDGES_EVM,
      });

      estimate.bridgeFeeInCurrency = bridgeFeeInInputCurrency(quote);
      estimate.totalFeeInCurrency = curvyFeeInCurrency + gasFeeInCurrency + estimate.bridgeFeeInCurrency;

      estimate.bridgeEstimateAmount = quote.estimate.toAmount;
    }

    return estimate;
  };

  const getResultingData = async (): Promise<DeliveredPlanValue> => {
    let balance = netAmount();

    if (estimate?.bridgeEstimateAmount) {
      balance = BigInt(estimate.bridgeEstimateAmount);
    }

    return {
      kind: "delivered",
      amount: balance,
      networkSlug: intent.type === "external-transfer" ? (intent.exitNetwork?.slug ?? networkSlug) : networkSlug,
      currencyAddress: intent.exitCurrency?.contractAddress ?? intent.currency.contractAddress,
    };
  };

  const execute = async (): Promise<DeliveredPlanValue> => {
    const tokenId = BigInt(input[0].vaultTokenId);
    const accountId = config.state.activeAccountId;
    invariant(accountId, "No active account to execute withdrawal.");
    const policy = await finalityPolicy();
    await runSubmittedCommand({
      config,
      commandId: ctx.id,
      action: "withdrawal",
      accountId,
      networkSlug,
      input,
      noteIds: inputNotes.map((note) => note.id),
      token: tokenId.toString(),
      amount: netAmount().toString(),
      recipients: [getRecipient()],
      finalityPolicy: policy,
      submissionMode: ctx.submissionMode,
      directSubmitter: ctx.directSubmitter,
      build: (supplied) =>
        buildWithdrawRequest({
          config,
          networkSlug,
          notes: inputNotes,
          ownerBjjPrivateKeyHex,
          destinationAddress: BigInt(getRecipient()),
          tokenId,
          supplied,
        }),
      terminalStatus: (included) => (included.status === "finalized" ? "finalized" : "input_spend_included"),
    });

    return getResultingData();
  };

  return {
    id: ctx.id,
    kind: "aggregator-withdraw",
    get recipient() {
      return getRecipient();
    },
    get grossAmount() {
      return grossAmount;
    },
    get estimate() {
      return estimate;
    },
    estimateFees,
    getResultingData,
    getExecutionData: () => undefined,
    getIntentOutput: () => undefined,
    execute,
  };
}

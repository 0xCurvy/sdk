import { getQuote } from "@lifi/sdk";
import { buildWithdrawRequest } from "@/actions/aggregator/buildWithdrawRequest";
import { relaySubmission } from "@/actions/aggregator/relaySubmission";
import { waitForRelay } from "@/actions/aggregator/waitForRelay";
import { getSpendWitnesses } from "@/actions/notes/getSpendWitnesses";
import { getProtocol } from "@/config/protocol";
import { vaultV2Abi } from "@/contracts/evm/abi";
import type { CommandData, Intent } from "@/planner/types";
import type { EvmRpc } from "@/rpc/evm";
import { type HexString, isHexString } from "@/types";
import { invariant } from "@/utils/invariant";
import { LIFI_BRIDGES_EVM } from "../constants";
import { normalizeCommandNotes } from "./normalizeCommandNotes";
import type { Command, CommandContext, CommandEstimate } from "./types";

/**
 * Closure-based aggregator-withdraw command (v3 client-proving).
 *
 * Requires a concrete `ctx.intent`; the recipient must be a hex address. Proves
 * the withdrawal locally ({@link buildWithdrawRequest}) from exactly `maxInputs`
 * committed input notes and relays the proof — the vault pays the destination.
 */
export function createAggregatorWithdrawCommand(ctx: CommandContext): Command {
  const { network, config, networkSlug, ownerBjjPrivateKeyHex } = ctx;
  // The withdraw command always has an intent (enforced by `createCommand`).
  const intent = ctx.intent as Intent;

  // --- AbstractAggregatorCommand: validate + normalize input to an array. ---
  const { input, inputNotes, grossAmount } = normalizeCommandNotes(ctx.input);

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
    // Relayer gas reimbursement: the vault deducts the token's `GasFees.withdrawal` from the
    // payout and transfers it DIRECTLY to the submitting EOA on-chain (not a note), so it must
    // be reflected in the estimate or the user's payout is overstated. Best-effort (0 when
    // unset/unreachable, as on devenv).
    let gasFeeInCurrency = 0n;
    try {
      const vault = network.vaultContractAddress;
      if (vault) {
        const rpc = config.getRpc().Network(networkSlug) as EvmRpc;
        const fees = await rpc.provider.readContract({
          address: vault as HexString,
          abi: vaultV2Abi,
          functionName: "perTokenGasFees",
          args: [BigInt(input[0].vaultTokenId)],
        });
        gasFeeInCurrency = (fees as { withdrawal: bigint }).withdrawal;
      }
    } catch {
      // no vault / unreadable — leave relayer gas at 0
    }

    estimate = {
      // Withdrawal protocol fee (Curvy): mirrors the vault's on-chain `withdrawalFee`
      // (0.2%); `groupFee` is the per-thousand rate (=2). Enforced on-chain by the vault.
      curvyFeeInCurrency: (grossAmount * BigInt(getProtocol({ config }).proving.withdrawal.groupFee)) / 1000n,
      gasFeeInCurrency,
    };

    // External transfer to another network => calculate bridge fee.
    if (intent.type === "external-transfer" && intent.exitNetwork) {
      const { currency: inputCurrency, exitNetwork, exitCurrency } = intent;

      // Prefer an explicit exitCurrency (cross-chain swap path); otherwise resolve
      // the matching currency on the exit network via the input currency's bridge
      // map (same-currency bridge).
      const exitNetworkCurrencyAddress =
        exitCurrency?.contractAddress ??
        exitNetwork.currencies.find((c) => c.id === inputCurrency?.bridgeNetworkIdToCurrencyIdMap?.[exitNetwork.id])
          ?.contractAddress;

      if (!exitNetworkCurrencyAddress) {
        throw new Error("Couldn't find exit currency on the specified exit network");
      }

      const quote = await getQuote({
        fromAddress: getRecipient(),
        toAddress: intent.exitAddress,
        fromChain: intent.network.chainId,
        toChain: intent.exitNetwork.chainId,
        fromToken: intent.currency.contractAddress,
        toToken: exitNetworkCurrencyAddress,
        fromAmount: netAmount().toString(),
        allowBridges: LIFI_BRIDGES_EVM,
      });

      estimate.bridgeFeeInCurrency =
        quote.estimate.feeCosts?.reduce((acc, curr) => acc + BigInt(curr.amount), 0n) ?? 0n;
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

      estimate.bridgeFeeInCurrency =
        quote.estimate.feeCosts?.reduce((acc, curr) => acc + BigInt(curr.amount), 0n) ?? 0n;

      estimate.bridgeEstimateAmount = quote.estimate.toAmount;
    }

    return estimate;
  };

  const getResultingBalanceEntry = async (): Promise<CommandData> => {
    let { symbol, currencyAddress, decimals } = input[0];
    const { networkSlug: slug, environment, lastUpdated, vaultTokenId, accountId } = input[0];

    let balance = netAmount();

    // Curvy swap => update resulting balance entry to reflect the swap target currency.
    if (intent.type === "curvy-swap") {
      symbol = intent.exitCurrency.symbol;
      currencyAddress = intent.exitCurrency.contractAddress;
      decimals = intent.exitCurrency.decimals;
      invariant(estimate?.bridgeEstimateAmount, "Swap withdrawal estimate is missing the bridge amount.");
      balance = BigInt(estimate.bridgeEstimateAmount);
    }

    return {
      accountId,
      vaultTokenId,
      networkSlug: slug,
      environment,
      balance,
      symbol,
      decimals,
      currencyAddress,
      lastUpdated,
    } as unknown as CommandData;
  };

  const execute = async (): Promise<CommandData> => {
    const tokenId = BigInt(input[0].vaultTokenId);

    // Inclusion proofs for the (committed, synced) input notes — all at one root.
    const supplied = await getSpendWitnesses({ config, networkSlug, noteIds: inputNotes.map((n) => n.id) });

    const built = await buildWithdrawRequest({
      config,
      networkSlug,
      notes: inputNotes,
      ownerBjjPrivateKeyHex,
      destinationAddress: BigInt(getRecipient()),
      tokenId,
      supplied,
    });

    const queued = await relaySubmission({ config, request: built });
    const finalized = await waitForRelay({ config, requestId: queued.requestId });
    if (finalized.status !== "finalized") {
      throw new Error(`withdrawal relay did not finalize (status: ${finalized.status})`);
    }

    return getResultingBalanceEntry();
  };

  return {
    id: ctx.id,
    name: "AggregatorWithdrawToVaultCommand",
    get recipient() {
      return getRecipient();
    },
    get grossAmount() {
      return grossAmount;
    },
    get estimate() {
      return estimate;
    },
    set estimate(value: CommandEstimate | undefined) {
      estimate = value;
    },
    estimateFees,
    getResultingBalanceEntry,
    execute,
  };
}

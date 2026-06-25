import { getQuote } from "@lifi/sdk";
import { buildWithdrawRequest } from "@/actions/aggregator/buildWithdrawRequest";
import { relaySubmission } from "@/actions/aggregator/relaySubmission";
import { waitForRelay } from "@/actions/aggregator/waitForRelay";
import { getSpendWitnesses } from "@/actions/notes/getSpendWitnesses";
import { balanceEntryToNote, type Note } from "@/note";
import type { CommandData, Intent } from "@/planner/types";
import { type HexString, isHexString } from "@/types";
import type { DeepNonNullable } from "@/types/helper";
import type { BalanceEntry } from "@/types/storage";
import { invariant } from "@/utils/invariant";
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
  if (Array.isArray(ctx.input)) {
    invariant(!ctx.input.some((note) => !note.vaultTokenId), "Invalid input for command, vaultTokenId is required.");
  } else {
    invariant(ctx.input.vaultTokenId, "Invalid input for command, vaultTokenId is required.");
  }

  const input: DeepNonNullable<BalanceEntry>[] = (
    Array.isArray(ctx.input) ? ctx.input.flat() : [ctx.input]
  ) as DeepNonNullable<BalanceEntry>[];

  const inputNotes: Note[] = input.map((noteBalanceEntry) => balanceEntryToNote(noteBalanceEntry));
  const inputNotesSum = inputNotes.reduce((acc, note) => acc + note.amount, 0n);

  const grossAmount = inputNotesSum;

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
    estimate = {
      curvyFeeInCurrency: (inputNotesSum * BigInt(network.withdrawCircuitConfig!.groupFee)) / 1000n,
      gasFeeInCurrency: 0n,
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
        allowBridges: ["gasZipBridge", "relaydepository", "across"],
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
        allowBridges: ["gasZipBridge", "relaydepository", "across"],
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
      balance = BigInt(estimate!.bridgeEstimateAmount!);
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
    const finalized = await waitForRelay({ config, requestId: queued.requestId, intervalMs: 500, attempts: 240 });
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

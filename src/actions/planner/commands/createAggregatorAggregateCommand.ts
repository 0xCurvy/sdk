import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import { buildAggregateRequest } from "@/actions/aggregator/buildAggregateRequest";
import { estimateAggregationCosts } from "@/actions/aggregator/internal/estimateAggregationCosts";
import type { AggregateRecipientInput } from "@/actions/aggregator/types";
import { syncNotes } from "@/actions/notes/syncNotes";
import { runSubmittedCommand } from "@/actions/planner/internal/runSubmittedCommand";
import { resolveInputFinalityPolicy } from "@/actions/planner/resolveInputFinalityPolicy";
import { updateTransferIntentStatus } from "@/actions/planner/updateTransferIntentStatus";
import type { CurvyPublicKeys } from "@/core/types";
import { AccountError, AggregationOutputTimeoutError } from "@/errors";
import { type Note, noteToBalanceEntry } from "@/note";
import { type AggregateDelivery, computeAggregateDelivery } from "@/planner/feeMath";
import type { DeliveredPlanValue, IntentOutput, PlanValue } from "@/planner/types";
import type { BalanceEntry } from "@/storage/types";
import { type HexString, isValidCurvyId } from "@/types";
import { invariant } from "@/utils/invariant";
import { pollForCriteriaUntil } from "@/utils/promise";
import { sleepWithTimerProvider } from "@/utils/timer";
import { generateNewNote } from "./generateNewNote";
import { normalizeCommandNotes } from "./normalizeCommandNotes";
import type { Command, CommandContext, CommandEstimate } from "./types";

type AggregateCommandExecution = {
  note: Note;
  operator?: CurvyPublicKeys;
  operatorFee: bigint;
  allocation: AggregateDelivery;
};

/**
 * Estimate and execute one aggregation. Intermediate commands return a synced,
 * spendable note to the active account; the final command reports delivery to
 * the intent recipient.
 */
export function createAggregatorAggregateCommand(ctx: CommandContext): Command {
  const { intent, senderCurvyId, config, networkSlug, ownerBjjPrivateKeyHex } = ctx;

  const { input, inputNotes, grossAmount } = normalizeCommandNotes(ctx.input);

  const finalityPolicy = () =>
    resolveInputFinalityPolicy({
      config,
      accountId: config.state.activeAccountId ?? undefined,
      networkSlug,
      intent,
    });

  const getRecipient = () => {
    if (intent) {
      if (isValidCurvyId(intent.recipient)) {
        return intent.recipient;
      }
      if (intent.recipientPublicKeys) {
        return intent.recipientPublicKeys;
      }
    }

    if (!senderCurvyId) {
      throw new AccountError("The active account needs a Curvy handle for a self-aggregation.");
    }
    return senderCurvyId;
  };

  let estimate = ctx.estimate;
  let execution = ctx.execution as AggregateCommandExecution | undefined;

  // Intermediate folds and withdrawal preparation keep value with the sender.
  // A final Curvy/gift recipient pays the proportional delivery fee.
  const deliversOutsideAccount =
    !!intent &&
    (isValidCurvyId(intent.recipient) || !!intent.recipientPublicKeys) &&
    intent.recipient !== senderCurvyId;

  const estimateFees = async (): Promise<CommandEstimate> => {
    if (estimate && execution) return estimate;

    const costs = await estimateAggregationCosts({
      config,
      networkSlug,
      token: inputNotes[0].token,
      submissionMode: ctx.submissionMode,
    });
    if (ctx.submissionMode === "relay") {
      invariant(costs.operator, "A relay quote must include the operator's public keys.");
    }

    const allocation = computeAggregateDelivery({
      grossAmount,
      requestedAmount: intent?.amount,
      recipientIsSender: !deliversOutsideAccount,
      additionalRecipients: costs.relayFee > 0n ? [{ amount: costs.relayFee, isSender: false }] : [],
      commitmentFee: costs.commitmentFee,
      protocolFeePerThousand: costs.protocolFeePerThousand,
    });
    const note = await generateNewNote(ctx, getRecipient(), input[0].vaultTokenId, allocation.deliveredAmount);

    execution = {
      note,
      operator: costs.operator,
      operatorFee: costs.relayFee,
      allocation,
    };
    estimate = {
      curvyFeeInCurrency: allocation.feeNoteAmount,
      gasFeeInCurrency: costs.relayFee,
      totalFeeInCurrency: allocation.feeNoteAmount + costs.relayFee,
      deliveredAmount: allocation.deliveredAmount,
      degradedToFeesOnAmount: allocation.degradedToFeesOnAmount,
    };

    return estimate;
  };

  // Estimate-time resulting balance (threaded to the next command during planning).
  const getResultingData = async (): Promise<PlanValue> => {
    const { symbol, accountId, environment, networkSlug: slug, decimals, currencyAddress } = input[0];
    invariant(execution, "Aggregation estimate is required before reading the resulting balance entry.");

    if (deliversOutsideAccount) {
      const delivered: DeliveredPlanValue = {
        kind: "delivered",
        amount: execution.allocation.deliveredAmount,
        networkSlug: slug,
        currencyAddress: currencyAddress as HexString,
      };
      return delivered;
    }

    return [
      noteToBalanceEntry(execution.note, {
        symbol,
        decimals,
        accountId,
        environment,
        networkSlug: slug,
        currencyAddress: currencyAddress as HexString,
      }),
    ];
  };

  // Wait for the freshly-emitted output note to be committed (by the batch-prover)
  // and synced, then return its real, spendable balance entry.
  const awaitSyncedOutput = async (noteId: bigint): Promise<BalanceEntry> => {
    const accountId = config.state.activeAccountId;
    invariant(accountId, "No active account to sync the aggregation output for.");
    const target = noteId.toString();
    const entry = await pollForCriteriaUntil(
      async (signal) => {
        await syncNotes({ config, networkSlug, accountId, signal });
        const balances = await config.storage.getProjectedBalances(accountId, networkSlug, await finalityPolicy());
        return balances.find((b) => b.networkSlug === networkSlug && b.id === target);
      },
      (found) => found !== undefined,
      config.executionPolicy.aggregationOutputTimeoutMs,
      config.executionPolicy.aggregationOutputPollIntervalMs,
      new AggregationOutputTimeoutError(),
      (ms) => sleepWithTimerProvider(config._internal.timerProvider, ms),
    );
    invariant(entry, "Aggregation output polling returned without a matching balance.");
    return entry;
  };

  const execute = async (): Promise<PlanValue | undefined> => {
    invariant(estimate, "Command not estimated.");
    invariant(execution, "Command execution data is missing.");
    const prepared = execution;

    const accountId = config.state.activeAccountId;
    invariant(accountId, "No active account to execute aggregation.");
    const policy = await finalityPolicy();
    const recipient = getRecipient();
    const recipientLabel = typeof recipient === "string" ? recipient : `${recipient.S}.${recipient.V}`;
    const self = getActiveKeyPairs(config);
    const { submission: built } = await runSubmittedCommand({
      config,
      commandId: ctx.id,
      action: "aggregation",
      accountId,
      networkSlug,
      input,
      noteIds: inputNotes.map((note) => note.id),
      token: inputNotes[0].token.toString(),
      amount: prepared.allocation.deliveredAmount.toString(),
      recipients: [recipientLabel],
      finalityPolicy: policy,
      submissionMode: ctx.submissionMode,
      directSubmitter: ctx.directSubmitter,
      build: (supplied) =>
        buildAggregateRequest({
          config,
          networkSlug,
          inputNotes,
          ownerBjjPrivateKeyHex,
          recipients: [{ note: prepared.note } satisfies AggregateRecipientInput],
          changeRecipient: { S: self.S, V: self.V, babyJubjubPublicKey: self.babyJubjubPublicKey },
          operatorRecipient: prepared.operator,
          operatorFee: prepared.operatorFee,
          supplied,
        }),
      outputCommitments: (submission) => (submission.outputNotes ?? []).map((note) => note.id.toString()),
      terminalStatus: () => (deliversOutsideAccount ? "awaiting_output_commit" : "input_spend_included"),
    });

    // Only self-owned outputs appear in this account's balance sync.
    if (deliversOutsideAccount) {
      return getResultingData();
    }
    const recipientNote = built.outputNotes?.[0];
    invariant(recipientNote, "buildAggregateRequest returned no output notes.");
    const result = await awaitSyncedOutput(recipientNote.id);
    await config.storage.putTransferSettlement({
      accountId,
      intentId: ctx.id,
      outputCommitment: recipientNote.id.toString(),
      commitBlockNumber: result.commitBlockNumber,
      commitBlockHash: result.commitBlockHash,
      leafIndex: result.leafIndex ?? undefined,
      status: result.finality === "hot" ? "available_hot" : "finalized",
    });
    await updateTransferIntentStatus({
      storage: config.storage,
      accountId,
      intentId: ctx.id,
      status: policy === "finalized" ? "finalized" : "available_hot",
    });
    return [result];
  };

  return {
    id: ctx.id,
    kind: "aggregator-aggregate",
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
    getExecutionData: () => execution,
    getIntentOutput: (): IntentOutput | undefined =>
      intent?.type === "send-to-anyone" && execution ? { kind: "gift", note: execution.note } : undefined,
    execute,
  };
}

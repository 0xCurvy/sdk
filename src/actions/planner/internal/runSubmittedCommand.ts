import { isDefinitiveRelayRejection } from "@/actions/aggregator/isDefinitiveRelayRejection";
import { relaySubmission } from "@/actions/aggregator/relaySubmission";
import { submitToChain } from "@/actions/aggregator/submitToChain";
import type { SubmittableSubmission } from "@/actions/aggregator/types";
import { waitForRelay } from "@/actions/aggregator/waitForRelay";
import { getSpendWitnesses } from "@/actions/notes/getSpendWitnesses";
import { syncNotes } from "@/actions/notes/syncNotes";
import type { CurvyConfig, DirectSubmitter, SubmissionMode } from "@/config/types";
import { AggregatorSubmitError, CommandError, normalizeCurvyError, RelayError } from "@/errors";
import type { SuppliedInclusionProofs } from "@/proving/witnessFromNotes";
import type { BalanceEntry, InputFinalityPolicy, TransferAttempt, TransferIntentStatus } from "@/storage/types";
import { invariant } from "@/utils/invariant";
import { recordTransferAttempt } from "../recordTransferAttempt";
import { recordTransferIntent } from "../recordTransferIntent";
import { updateTransferIntentStatus } from "../updateTransferIntentStatus";

export type SubmissionInclusion = {
  status: "included" | "finalized";
  transactionHash?: string;
  blockNumber?: string;
  blockHash?: string;
  includedAt?: string;
};

export type RunSubmittedCommandParameters<TSubmission extends SubmittableSubmission> = {
  config: CurvyConfig;
  commandId: string;
  action: "aggregation" | "withdrawal";
  accountId: string;
  networkSlug: string;
  input: BalanceEntry[];
  noteIds: readonly bigint[];
  token: string;
  amount: string;
  recipients: string[];
  finalityPolicy: InputFinalityPolicy;
  submissionMode: SubmissionMode;
  directSubmitter?: DirectSubmitter;
  build: (supplied: SuppliedInclusionProofs) => Promise<TSubmission>;
  outputCommitments?: (submission: TSubmission) => string[];
  terminalStatus: (included: SubmissionInclusion) => TransferIntentStatus;
};

export type SubmittedCommandResult<TSubmission extends SubmittableSubmission> = {
  submission: TSubmission;
  included: SubmissionInclusion;
  attempt: TransferAttempt;
  outputCommitments: string[];
};

/** Run the shared proof, persistence, submission, and inclusion lifecycle for a spend command. */
export async function runSubmittedCommand<TSubmission extends SubmittableSubmission>(
  parameters: RunSubmittedCommandParameters<TSubmission>,
): Promise<SubmittedCommandResult<TSubmission>> {
  const {
    config,
    commandId,
    action,
    accountId,
    networkSlug,
    input,
    noteIds,
    token,
    amount,
    recipients,
    finalityPolicy,
    submissionMode,
  } = parameters;

  if (finalityPolicy === "finalized" && input.some((entry) => entry.finality === "hot")) {
    throw new CommandError(`${action} requires finalized inputs, but the prepared plan contains a hot note.`);
  }
  if (submissionMode === "direct" && !parameters.directSubmitter) {
    throw new AggregatorSubmitError(
      "Direct submission requires a directSubmitter on createCurvyConfig(...) or executeIntent(...).",
    );
  }

  await syncNotes({ config, networkSlug, accountId });
  const spendable = await config.storage.getProjectedBalances(accountId, networkSlug, finalityPolicy);
  if (input.some((entry) => !spendable.some((candidate) => candidate.id === entry.id))) {
    throw new CommandError(`${action} inputs changed finality or canonical status after estimation.`);
  }

  const recordIntent = (outputCommitments: string[]) =>
    recordTransferIntent({
      storage: config.storage,
      accountId,
      intentId: commandId,
      networkSlug,
      action,
      token,
      amount,
      recipients,
      input,
      outputCommitments,
      finalityPolicy,
    });
  await recordIntent([]);

  let attempt: TransferAttempt | undefined;
  let submission: TSubmission;
  try {
    const supplied = await getSpendWitnesses({ config, networkSlug, noteIds: [...noteIds] });
    attempt = await recordTransferAttempt({
      storage: config.storage,
      accountId,
      intentId: commandId,
      networkSlug,
      environment: config.state.environment,
      referencedRoot: supplied.notesRoot,
    });
    submission = await parameters.build(supplied);
  } catch (error) {
    const normalized = normalizeCurvyError(error, `Could not prepare the ${action} proof.`);
    if (attempt) await config.storage.putTransferAttempt({ ...attempt, status: "failed", errorCode: normalized.code });
    await updateTransferIntentStatus({
      storage: config.storage,
      accountId,
      intentId: commandId,
      status: "failed",
      activeAttemptGeneration: attempt?.generation,
    });
    throw normalized;
  }
  invariant(attempt, "A built submission must have a recorded transfer attempt.");

  const outputCommitments = parameters.outputCommitments?.(submission) ?? [];
  if (outputCommitments.length > 0) {
    await recordIntent(outputCommitments);
    await Promise.all(
      outputCommitments.map((outputCommitment) =>
        config.storage.putTransferSettlement({
          accountId,
          intentId: commandId,
          outputCommitment,
          status: "pending",
        }),
      ),
    );
  }

  let included: SubmissionInclusion;
  if (submissionMode === "relay") {
    let queued: Awaited<ReturnType<typeof relaySubmission>>;
    try {
      queued = await relaySubmission({ config, request: submission, intentId: commandId });
    } catch (error) {
      const rejected = isDefinitiveRelayRejection(error);
      await config.storage.putTransferAttempt({
        ...attempt,
        submittedAt: Date.now(),
        status: rejected ? "failed" : "submitted",
        errorCode: rejected ? "relay_rejected" : "relay_outcome_unknown",
      });
      await updateTransferIntentStatus({
        storage: config.storage,
        accountId,
        intentId: commandId,
        status: rejected ? "failed" : "submitted",
        activeAttemptGeneration: attempt.generation,
      });
      throw normalizeCurvyError(error, `Could not relay the ${action} proof.`);
    }

    await config.storage.putTransferAttempt({
      ...attempt,
      relayRequestId: queued.requestId,
      relayTxHash: queued.transactionHash,
      submittedAt: Date.now(),
      status: "submitted",
    });
    await updateTransferIntentStatus({
      storage: config.storage,
      accountId,
      intentId: commandId,
      status: "submitted",
      activeAttemptGeneration: attempt.generation,
    });

    const relayResult = await waitForRelay({ config, requestId: queued.requestId, waitFor: "included" });
    if (relayResult.status !== "included" && relayResult.status !== "finalized") {
      if (relayResult.status === "failed") {
        await config.storage.putTransferAttempt({
          ...attempt,
          relayRequestId: queued.requestId,
          relayTxHash: relayResult.canonicalTransactionHash ?? relayResult.transactionHash,
          submittedAt: Date.now(),
          status: "failed",
          errorCode: relayResult.error ?? "relay_failed",
        });
        await updateTransferIntentStatus({
          storage: config.storage,
          accountId,
          intentId: commandId,
          status: "failed",
          activeAttemptGeneration: attempt.generation,
        });
      }
      throw new RelayError(`${action} was not canonically included (status: ${relayResult.status}).`);
    }
    included = {
      status: relayResult.status,
      transactionHash: relayResult.canonicalTransactionHash ?? relayResult.transactionHash,
      blockNumber: relayResult.blockNumber,
      blockHash: relayResult.blockHash,
      includedAt: relayResult.includedAt,
    };
    await config.storage.putTransferAttempt({
      ...attempt,
      relayRequestId: queued.requestId,
      relayTxHash: included.transactionHash,
      submittedAt: Date.now(),
      inclusionBlockNumber: included.blockNumber ? Number(included.blockNumber) : undefined,
      inclusionBlockHash: included.blockHash,
      includedAt: included.includedAt ? Date.parse(included.includedAt) : Date.now(),
      status: included.status === "finalized" ? "finalized" : "included",
    });
  } else {
    const network = config.state.networks.find((candidate) => candidate.slug === networkSlug);
    if (!network) throw new AggregatorSubmitError(`Unknown network "${networkSlug}" for direct submission.`);
    try {
      const walletClient = await parameters.directSubmitter!({ network });
      const result = await submitToChain({ config, request: submission, walletClient });
      included = {
        status: "included",
        transactionHash: result.transactionHash,
        blockNumber: result.receipt.blockNumber.toString(),
        blockHash: result.receipt.blockHash,
        includedAt: new Date().toISOString(),
      };
      await config.storage.putTransferAttempt({
        ...attempt,
        relayTxHash: result.transactionHash,
        submittedAt: Date.now(),
        inclusionBlockNumber: Number(result.receipt.blockNumber),
        inclusionBlockHash: result.receipt.blockHash,
        includedAt: Date.now(),
        status: "included",
      });
    } catch (error) {
      const normalized = normalizeCurvyError(error, `Could not submit the ${action} proof directly.`);
      await config.storage.putTransferAttempt({
        ...attempt,
        submittedAt: Date.now(),
        status: "failed",
        errorCode: normalized.code,
      });
      await updateTransferIntentStatus({
        storage: config.storage,
        accountId,
        intentId: commandId,
        status: "failed",
        activeAttemptGeneration: attempt.generation,
      });
      throw normalized;
    }
  }

  await updateTransferIntentStatus({
    storage: config.storage,
    accountId,
    intentId: commandId,
    status: parameters.terminalStatus(included),
    activeAttemptGeneration: attempt.generation,
  });

  return { submission, included, attempt, outputCommitments };
}

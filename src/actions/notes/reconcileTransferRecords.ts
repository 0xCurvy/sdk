import type { CurvyConfig } from "@/config/types";
import type { RelaySubmitReturnType } from "@/types/aggregator";
import type { NotesCheckpoint, TransferHistoryRecord } from "@/types/storage";

type ReconcileTransferRecordsOptions = {
  config: CurvyConfig;
  accountId: string;
  networkSlug: string;
  checkpoint: NotesCheckpoint;
};

/** Reconcile stable intents and attempts against the rebuilt finalized+hot projection. */
export async function reconcileTransferRecords(options: ReconcileTransferRecordsOptions): Promise<void> {
  const { config, accountId, networkSlug, checkpoint } = options;
  const [intents, dependencies, blocks, finalizedLeaves] = await Promise.all([
    config.storage.getTransferIntents(accountId, networkSlug),
    config.storage.getIntentDependencies(accountId),
    config.storage.getHotBlocks(networkSlug),
    config.storage.getCommittedLog(networkSlug, "leaf"),
  ]);
  const hotByHash = new Map(blocks.map((block) => [block.hash, block]));
  const hotHead = blocks.at(-1)?.number ?? checkpoint.finalizedBlockNumber ?? checkpoint.blockNumber;
  const finalizedCommitments = new Set(finalizedLeaves.map((noteId) => BigInt(noteId).toString()));
  const hotCommitments = new Map(
    blocks.flatMap((block) =>
      block.committedNotes.map((note) => [BigInt(note.noteId).toString(), { block, note }] as const),
    ),
  );
  const finalizedNumber = checkpoint.finalizedBlockNumber ?? checkpoint.blockNumber;
  const updated = new Map<string, TransferHistoryRecord>();
  const network = config.state.networks.find((candidate) => candidate.slug === networkSlug);

  for (const intent of intents) {
    const attempts = await config.storage.getTransferAttempts(accountId, intent.intentId);
    for (const attempt of attempts) {
      let next = attempt;
      let relayVerdict: "included" | "finalized" | "reorged" | undefined;
      if (attempt.relayRequestId || network) {
        try {
          const relay: RelaySubmitReturnType = attempt.relayRequestId
            ? await config.api.relay.GetSubmissionStatus(attempt.relayRequestId)
            : await config.api.relay.GetSubmissionByIntent(intent.intentId, Number(network?.chainId));
          next = { ...next, relayRequestId: relay.requestId };
          if (relay.status === "included" || relay.status === "finalized") {
            relayVerdict = relay.status;
            next = {
              ...next,
              relayTxHash: relay.canonicalTransactionHash ?? relay.transactionHash ?? next.relayTxHash,
              inclusionBlockNumber: relay.blockNumber ? Number(relay.blockNumber) : next.inclusionBlockNumber,
              inclusionBlockHash: relay.blockHash ?? next.inclusionBlockHash,
              includedAt: relay.includedAt ? Date.parse(relay.includedAt) : (next.includedAt ?? Date.now()),
              status: relay.status,
            };
          } else if (relay.status === "reorged" || relay.status === "needs_rebuild") {
            relayVerdict = "reorged";
            next = { ...next, status: "reorged", errorCode: relay.reorgReason ?? "referenced_root_orphaned" };
          } else if (
            ["queued", "submitting", "submitted"].includes(relay.status) &&
            attempt.status === "included" &&
            (relay.retryGeneration ?? 0) > 0
          ) {
            next = { ...next, status: "submitted", errorCode: "relayer_retrying_after_reorg" };
          } else if (relay.status === "failed") {
            next = { ...next, status: "failed", errorCode: relay.error ?? "relay_failed" };
          }
        } catch {
          // Relay availability is not required to rebuild the local chain projection.
        }
      }
      if (relayVerdict === "finalized") {
        next = { ...next, status: "finalized", errorCode: undefined };
      } else if (next.inclusionBlockHash && hotByHash.has(next.inclusionBlockHash)) {
        next = { ...next, status: "included" };
      } else if (relayVerdict === "reorged") {
        next = { ...next, status: "reorged" };
      } else if (
        !relayVerdict &&
        next.status === "included" &&
        next.inclusionBlockNumber !== undefined &&
        next.inclusionBlockNumber > finalizedNumber &&
        next.inclusionBlockNumber <= hotHead
      ) {
        next = { ...next, status: "reorged", errorCode: "inclusion_block_orphaned" };
      }
      await config.storage.putTransferAttempt(next);
    }

    const settlements = await config.storage.getTransferSettlements(accountId, intent.intentId);
    for (const settlement of settlements) {
      const located = hotCommitments.get(settlement.outputCommitment);
      let next = settlement;
      if (located) {
        next = {
          ...next,
          batchTxHash: located.note.commitTransactionHash,
          commitBlockNumber: located.block.number,
          commitBlockHash: located.block.hash,
          leafIndex: located.note.index,
          status: "available_hot",
        };
      } else if (finalizedCommitments.has(settlement.outputCommitment)) {
        next = { ...next, status: "finalized" };
      } else if (settlement.status === "available_hot") {
        next = { ...next, status: "reorged" };
      }
      await config.storage.putTransferSettlement(next);
    }
  }

  // Parent status is evaluated in dependency order; repeated passes handle a
  // restored graph without assuming insertion order.
  for (let pass = 0; pass <= intents.length; pass += 1) {
    let changed = false;
    for (const intent of intents) {
      const parents = dependencies.filter((edge) => edge.toIntentId === intent.intentId);
      const parentBlocked = parents.some((edge) => {
        const parent = updated.get(edge.fromIntentId) ?? intents.find((item) => item.intentId === edge.fromIntentId);
        return parent && ["reorged", "rebuilding", "blocked_upstream", "failed"].includes(parent.status);
      });
      const attempts = await config.storage.getTransferAttempts(accountId, intent.intentId);
      const active = attempts.find((attempt) => attempt.generation === intent.activeAttemptGeneration);
      const settlements = await config.storage.getTransferSettlements(accountId, intent.intentId);
      let status = intent.status;
      if (parentBlocked) status = "blocked_upstream";
      else if (active?.status === "reorged") status = "rebuilding";
      else if (active?.status === "failed") status = "failed";
      else if (
        active?.status === "finalized" &&
        (intent.action === "withdrawal" || settlements.every((settlement) => settlement.status === "finalized"))
      )
        status = "finalized";
      else if (active?.status === "included" && intent.action === "withdrawal") status = "input_spend_included";
      else if (active?.status === "included" && settlements.some((settlement) => settlement.status === "available_hot"))
        status = "available_hot";
      else if (active?.status === "included") status = "awaiting_output_commit";
      const next = status === intent.status ? intent : { ...intent, status, statusUpdatedAt: Date.now() };
      if (updated.get(intent.intentId)?.status !== next.status) changed = true;
      updated.set(intent.intentId, next);
    }
    if (!changed) break;
  }
  await Promise.all([...updated.values()].map((intent) => config.storage.putTransferIntent(intent)));
}

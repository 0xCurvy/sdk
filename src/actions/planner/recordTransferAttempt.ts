import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { CommandError } from "@/errors";
import type { BalanceStore, NotesStore, TransferStore } from "@/storage/contracts";
import type { TransferAttempt } from "@/storage/types";

type RecordTransferAttemptStore = TransferStore & NotesStore & Pick<BalanceStore, "getHotSyncState">;

type RecordTransferAttemptOptions = {
  storage: RecordTransferAttemptStore;
  accountId: string;
  intentId: string;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  referencedRoot: bigint;
  now?: number;
};

/** Append one proof generation, pinned to the exact finalized or hot root block. */
export async function recordTransferAttempt(options: RecordTransferAttemptOptions): Promise<TransferAttempt> {
  const [hot, checkpoint, previous] = await Promise.all([
    options.storage.getHotSyncState(options.networkSlug),
    options.storage.getNotesCheckpoint(options.networkSlug, options.environment),
    options.storage.getTransferAttempts(options.accountId, options.intentId),
  ]);
  const root = options.referencedRoot.toString();
  const referencedRootBlockHash =
    hot?.notesRoot === root
      ? hot.hotBlockHash
      : checkpoint?.root === root && checkpoint.finalizedBlockHash
        ? checkpoint.finalizedBlockHash
        : null;
  if (!referencedRootBlockHash) {
    throw new CommandError(`Notes root ${root} is no longer available for spending.`);
  }
  const attempt: TransferAttempt = {
    accountId: options.accountId,
    intentId: options.intentId,
    generation: Math.max(0, ...previous.map((item) => item.generation)) + 1,
    referencedRoot: root,
    referencedRootBlockHash,
    proofCreatedAt: options.now ?? Date.now(),
    status: "created",
  };
  await options.storage.putTransferAttempt(attempt);
  return attempt;
}

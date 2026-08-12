import { StorageError } from "@/errors";
import type { TransferStore } from "@/storage/contracts";
import type { TransferHistoryRecord, TransferIntentStatus } from "@/storage/types";

type UpdateTransferIntentStatusOptions = {
  storage: TransferStore;
  accountId: string;
  intentId: string;
  status: TransferIntentStatus;
  activeAttemptGeneration?: number;
  now?: number;
};

/** Update lifecycle state without replacing the stable user-facing intent id. */
export async function updateTransferIntentStatus(
  options: UpdateTransferIntentStatusOptions,
): Promise<TransferHistoryRecord> {
  const intent = (await options.storage.getTransferIntents(options.accountId)).find(
    (record) => record.intentId === options.intentId,
  );
  if (!intent) throw new StorageError(`Transfer intent ${options.intentId} was not found.`);
  const updated: TransferHistoryRecord = {
    ...intent,
    status: options.status,
    statusUpdatedAt: options.now ?? Date.now(),
    activeAttemptGeneration: options.activeAttemptGeneration ?? intent.activeAttemptGeneration,
  };
  await options.storage.putTransferIntent(updated);
  return updated;
}

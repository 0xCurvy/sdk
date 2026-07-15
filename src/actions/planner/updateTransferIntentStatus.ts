import type { StorageInterface } from "@/interfaces/storage";
import type { TransferHistoryRecord, TransferIntentStatus } from "@/types/storage";

type UpdateTransferIntentStatusOptions = {
  storage: StorageInterface;
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
  if (!intent) throw new Error(`unknown transfer intent ${options.intentId}`);
  const updated: TransferHistoryRecord = {
    ...intent,
    status: options.status,
    statusUpdatedAt: options.now ?? Date.now(),
    activeAttemptGeneration: options.activeAttemptGeneration ?? intent.activeAttemptGeneration,
  };
  await options.storage.putTransferIntent(updated);
  return updated;
}

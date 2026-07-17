import type { StorageInterface } from "@/interfaces/storage";
import type { BalanceEntry, InputFinalityPolicy, TransferHistoryRecord } from "@/types/storage";

type RecordTransferIntentOptions = {
  storage: StorageInterface;
  accountId: string;
  intentId: string;
  networkSlug: string;
  action: "aggregation" | "withdrawal";
  token: string;
  amount: string;
  recipients: string[];
  input: BalanceEntry[];
  outputCommitments: string[];
  finalityPolicy: InputFinalityPolicy;
  now?: number;
};

/** Upsert a stable intent and its locally knowable hot-note dependency edges. */
export async function recordTransferIntent(options: RecordTransferIntentOptions): Promise<TransferHistoryRecord> {
  const now = options.now ?? Date.now();
  const existing = (await options.storage.getTransferIntents(options.accountId)).find(
    (intent) => intent.intentId === options.intentId,
  );
  const parents = new Set(
    options.input
      .filter((entry) => entry.finality === "hot" && entry.originIntentId && entry.originIntentId !== options.intentId)
      .map((entry) => entry.originIntentId as string),
  );
  const all = await options.storage.getTransferIntents(options.accountId);
  const byId = new Map(all.map((intent) => [intent.intentId, intent]));
  const dependencies = [...parents].map((parentId) => ({
    accountId: options.accountId,
    fromIntentId: parentId,
    toIntentId: options.intentId,
    noteId: options.input.find((entry) => entry.originIntentId === parentId)?.id ?? "unknown",
  }));
  const existingEdges = await options.storage.getIntentDependencies(options.accountId);
  for (const dependency of dependencies) {
    const queue = [dependency.toIntentId];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (current === dependency.fromIntentId) throw new Error("transfer intent dependency would create a cycle");
      if (visited.has(current)) continue;
      visited.add(current);
      for (const edge of existingEdges) if (edge.fromIntentId === current) queue.push(edge.toIntentId);
    }
  }
  await options.storage.putIntentDependencies(dependencies);

  const localDependencyDepth =
    parents.size === 0
      ? 0
      : 1 + Math.max(...[...parents].map((parentId) => byId.get(parentId)?.localDependencyDepth ?? 0));
  const record: TransferHistoryRecord = {
    intentId: options.intentId,
    accountId: options.accountId,
    networkSlug: options.networkSlug,
    direction: "outgoing",
    action: options.action,
    token: options.token,
    amount: options.amount,
    recipients: options.recipients,
    createdAt: existing?.createdAt ?? now,
    statusUpdatedAt: now,
    finalityPolicy: options.finalityPolicy,
    localDependencyDepth,
    hasExternalHotDependency: options.input.some((entry) => entry.finality === "hot" && !entry.originIntentId),
    status: "proving",
    inputCommitments: options.input.map((entry) => entry.id),
    expectedOutputCommitments:
      options.outputCommitments.length > 0 ? options.outputCommitments : (existing?.expectedOutputCommitments ?? []),
    activeAttemptGeneration: existing?.activeAttemptGeneration ?? 0,
  };
  await options.storage.putTransferIntent(record);
  return record;
}

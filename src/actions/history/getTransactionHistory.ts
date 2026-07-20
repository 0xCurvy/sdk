import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { NoActiveAccountError } from "@/errors";
import type {
  CurrencyMetadata,
  TransferAttempt,
  TransferHistoryRecord,
  TransferIntentStatus,
  TxHistoryEntry,
} from "@/types/storage";

type TransactionHistoryKind = "deposit" | "receive" | "send" | "withdrawal" | "spend";

type TransactionHistoryItem = {
  id: string;
  accountId: string;
  networkSlug: string;
  networkName?: string;
  blockExplorerUrl?: string;
  direction: "incoming" | "outgoing";
  kind: TransactionHistoryKind;
  source: "local_intent" | "chain";
  token: string;
  amount: string;
  currency?: Pick<CurrencyMetadata, "address" | "decimals" | "iconUrl" | "name" | "symbol">;
  recipients: string[];
  timestamp: number;
  status: TransferIntentStatus;
  finality?: "hot" | "finalized";
  transactionHash?: string;
  blockNumber?: number;
  blockHash?: string;
  noteId?: string;
  localDependencyDepth?: number;
  hasExternalHotDependency?: boolean;
};

export type GetTransactionHistoryParameters = WithConfig<{
  accountId?: string;
  networkSlug?: string;
  /** Vault token id as a decimal string. */
  token?: string;
  limit?: number;
}>;

const chainStatus = (entry: TxHistoryEntry): TransferIntentStatus => {
  if (entry.status) return entry.status;
  return entry.finality === "hot" ? "available_hot" : "finalized";
};

const intentFinality = (intent: TransferHistoryRecord): TransactionHistoryItem["finality"] => {
  if (intent.status === "finalized") return "finalized";
  if (["input_spend_included", "awaiting_output_commit", "available_hot"].includes(intent.status)) return "hot";
  return undefined;
};

/**
 * Return user-facing activity by merging rich local intents with the chain-reconstructed fallback.
 * Local dependency parents and their note-level receive/spend events are hidden to avoid exposing
 * planner internals or duplicating one user action after a rescan.
 */
export async function getTransactionHistory(
  parameters: GetTransactionHistoryParameters = {},
): Promise<TransactionHistoryItem[]> {
  const config = resolveConfig(parameters.config);
  const accountId = parameters.accountId ?? config.state.activeAccountId;
  if (!accountId) throw new NoActiveAccountError();

  const [storedHistory, storedIntents, dependencies] = await Promise.all([
    config.storage.getTxHistory(
      accountId,
      parameters.networkSlug ? { networkSlug: parameters.networkSlug } : undefined,
    ),
    config.storage.getTransferIntents(accountId, parameters.networkSlug),
    config.storage.getIntentDependencies(accountId),
  ]);
  const activeNetworkSlugs = new Set(config.state.activeNetworks.map((network) => network.slug));
  const inSelectedNetwork = (networkSlug: string): boolean =>
    parameters.networkSlug
      ? networkSlug === parameters.networkSlug
      : activeNetworkSlugs.size === 0 || activeNetworkSlugs.has(networkSlug);
  const history = storedHistory.filter(
    (entry) =>
      entry.environment === config.state.environment &&
      inSelectedNetwork(entry.networkSlug) &&
      (!parameters.token || entry.token === parameters.token),
  );
  const intents = storedIntents.filter(
    (intent) => inSelectedNetwork(intent.networkSlug) && (!parameters.token || intent.token === parameters.token),
  );

  const localInputCommitments = new Set(intents.flatMap((intent) => intent.inputCommitments));
  const localOutputCommitments = new Set(intents.flatMap((intent) => intent.expectedOutputCommitments));
  const dependencyParents = new Set(dependencies.map((dependency) => dependency.fromIntentId));
  const visibleIntents = intents.filter((intent) => !dependencyParents.has(intent.intentId));

  const attempts = new Map<string, TransferAttempt | undefined>();
  await Promise.all(
    visibleIntents.map(async (intent) => {
      const rows = await config.storage.getTransferAttempts(accountId, intent.intentId);
      attempts.set(
        intent.intentId,
        rows.find((attempt) => attempt.generation === intent.activeAttemptGeneration) ?? rows.at(-1),
      );
    }),
  );

  const localItems: TransactionHistoryItem[] = visibleIntents.map((intent) => {
    const attempt = attempts.get(intent.intentId);
    const network = config.state.networks.find((candidate) => candidate.slug === intent.networkSlug);
    return {
      id: `intent:${intent.intentId}`,
      accountId,
      networkSlug: intent.networkSlug,
      networkName: network?.name,
      blockExplorerUrl: network?.blockExplorerUrl,
      direction: intent.direction,
      kind: intent.action === "withdrawal" ? "withdrawal" : "send",
      source: "local_intent",
      token: intent.token,
      amount: intent.amount,
      recipients: intent.recipients,
      timestamp: intent.createdAt,
      status: intent.status,
      finality: intentFinality(intent),
      transactionHash: attempt?.relayTxHash,
      blockNumber: attempt?.inclusionBlockNumber,
      blockHash: attempt?.inclusionBlockHash,
      localDependencyDepth: intent.localDependencyDepth,
      hasExternalHotDependency: intent.hasExternalHotDependency,
    };
  });

  const chainItems: TransactionHistoryItem[] = history
    .filter((entry) =>
      entry.kind === "receive" ? !localOutputCommitments.has(entry.noteId) : !localInputCommitments.has(entry.noteId),
    )
    .map((entry) => {
      const network = config.state.networks.find((candidate) => candidate.slug === entry.networkSlug);
      return {
        id: `chain:${entry.id}`,
        accountId,
        networkSlug: entry.networkSlug,
        networkName: network?.name,
        blockExplorerUrl: network?.blockExplorerUrl,
        direction: entry.kind === "receive" ? "incoming" : "outgoing",
        kind: entry.kind === "receive" ? (entry.origin === "deposit" ? "deposit" : "receive") : "spend",
        source: "chain",
        token: entry.token,
        amount: entry.amount,
        recipients: [],
        timestamp: entry.observedAt,
        status: chainStatus(entry),
        finality: entry.finality ?? "finalized",
        transactionHash: entry.requestTxHash ?? entry.commitTxHash,
        blockNumber: entry.blockNumber,
        blockHash: entry.blockHash,
        noteId: entry.noteId,
      };
    });

  const sorted = [...localItems, ...chainItems].sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
  const limited = parameters.limit === undefined ? sorted : sorted.slice(0, Math.max(0, parameters.limit));
  const metadata = new Map<string, Promise<CurrencyMetadata | undefined>>();
  const getMetadata = (item: TransactionHistoryItem): Promise<CurrencyMetadata | undefined> => {
    const key = `${item.networkSlug}:${item.token}`;
    const existing = metadata.get(key);
    if (existing) return existing;
    const pending = config.storage.getCurrencyMetadata(BigInt(item.token), item.networkSlug).catch(() => undefined);
    metadata.set(key, pending);
    return pending;
  };

  return Promise.all(
    limited.map(async (item) => {
      const currency = await getMetadata(item);
      return currency
        ? {
            ...item,
            currency: {
              address: currency.address,
              decimals: currency.decimals,
              iconUrl: currency.iconUrl,
              name: currency.name,
              symbol: currency.symbol,
            },
          }
        : item;
    }),
  );
}

export type { TransactionHistoryItem, TransactionHistoryKind };

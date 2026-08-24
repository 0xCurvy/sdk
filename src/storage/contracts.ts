import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type {
  BalanceBreakdown,
  BalanceEntry,
  CommittedLogKind,
  CurrencyMetadata,
  FinalityPreference,
  HotBlockRecord,
  HotNoteState,
  HotOverlayReplacement,
  HotSyncState,
  InputFinalityPolicy,
  IntentDependency,
  LiveShardRecord,
  NotesCheckpoint,
  SerializedNoteWitness,
  TotalBalance,
  TransferAttempt,
  TransferHistoryRecord,
  TransferSettlement,
  TxHistoryEntry,
} from "@/storage/types";
import type { CurvyAccountData, HexString, PriceData, SerializedCurvyAccount } from "@/types";

export interface StorageLifecycleStore {
  /** Clear chain-derived caches while preserving accounts, preferences, and durable history. */
  clearCachedData(): Promise<void>;
  /** Clear every SDK-owned record. */
  clearStorage(): Promise<void>;
  /** Run a notes update atomically when the storage engine supports transactions. */
  runInNotesTransaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface AccountStore {
  insertCurvyAccount(account: SerializedCurvyAccount): Promise<void>;
  upsertCurvyAccount(account: SerializedCurvyAccount): Promise<void>;
  updateCurvyAccountData(accountId: string, changes: Partial<CurvyAccountData>): Promise<void>;
  replaceCurvyAccountData(accountId: string, data: CurvyAccountData): Promise<void>;
  getCurvyAccountDataById(id: string): Promise<CurvyAccountData>;
}

export interface CurrencyStore {
  upsertCurrencyMetadata(metadata: Map<string, CurrencyMetadata>): Promise<void>;
  getCurrencyMetadata(addressOrId: string | bigint, networkSlug: string): Promise<CurrencyMetadata>;
  upsertPriceData(data: Map<string, PriceData>): Promise<void>;
  getCurrencyPrice(token: string): Promise<PriceData>;
  getPriceFeed(): Promise<Map<string, PriceData>>;
}

export interface BalanceStore {
  updateBalanceEntries(accountId: string, networkSlug: string, entries: BalanceEntry[]): Promise<void>;
  removeSpentBalanceEntries(entries: BalanceEntry[]): Promise<void>;
  getBalances(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<BalanceEntry[]>;
  getTotals(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<TotalBalance[]>;
  getBalancesByCurrencyAndNetwork(
    accountId: string,
    currencyAddress: HexString,
    networkSlug: string,
  ): Promise<BalanceEntry[]>;
  replaceHotOverlay(replacement: HotOverlayReplacement): Promise<void>;
  clearHotOverlay(networkSlug: string, accountId?: string): Promise<void>;
  getHotSyncState(networkSlug: string): Promise<HotSyncState | null>;
  getHotBlocks(networkSlug: string): Promise<HotBlockRecord[]>;
  getHotNoteStates(accountId: string, networkSlug: string): Promise<HotNoteState[]>;
  getProjectedBalances(accountId: string, networkSlug: string, policy: InputFinalityPolicy): Promise<BalanceEntry[]>;
  getBalanceBreakdown(accountId: string, networkSlug: string, currencyAddress: string): Promise<BalanceBreakdown>;
}

export interface NotesStore {
  getNotesCheckpoint(networkSlug: string, environment: NETWORK_ENVIRONMENT_VALUES): Promise<NotesCheckpoint | null>;
  putNotesCheckpoint(checkpoint: NotesCheckpoint): Promise<void>;
  appendCommittedLog(networkSlug: string, kind: CommittedLogKind, fromIndex: number, items: string[]): Promise<void>;
  getCommittedLog(networkSlug: string, kind: CommittedLogKind): Promise<string[]>;
  getCommittedLogCount(networkSlug: string, kind: CommittedLogKind): Promise<number>;
  getShardRoots(networkSlug: string): Promise<string[]>;
  appendShardRoots(networkSlug: string, fromShard: number, roots: string[]): Promise<void>;
  getNoteWitnesses(networkSlug: string): Promise<SerializedNoteWitness[]>;
  putNoteWitness(witness: SerializedNoteWitness): Promise<void>;
  deleteNoteWitness(networkSlug: string, noteId: string): Promise<void>;
  getLiveShard(networkSlug: string): Promise<LiveShardRecord | null>;
  putLiveShard(record: LiveShardRecord): Promise<void>;
}

export interface HistoryStore {
  putTxHistory(entries: TxHistoryEntry[]): Promise<void>;
  getTxHistory(accountId: string, filter?: { networkSlug?: string }): Promise<TxHistoryEntry[]>;
}

export interface TransferStore {
  putTransferIntent(intent: TransferHistoryRecord): Promise<void>;
  getTransferIntents(accountId: string, networkSlug?: string): Promise<TransferHistoryRecord[]>;
  putTransferAttempt(attempt: TransferAttempt): Promise<void>;
  getTransferAttempts(accountId: string, intentId: string): Promise<TransferAttempt[]>;
  putTransferSettlement(settlement: TransferSettlement): Promise<void>;
  getTransferSettlements(accountId: string, intentId: string): Promise<TransferSettlement[]>;
  putIntentDependencies(dependencies: IntentDependency[]): Promise<void>;
  getIntentDependencies(accountId: string): Promise<IntentDependency[]>;
}

export interface PreferenceStore {
  putFinalityPreference(preference: FinalityPreference): Promise<void>;
  getFinalityPreference(accountId: string, networkSlug: string): Promise<FinalityPreference>;
}

export interface PrivateTokenStore {
  appendPrivateTokens(scopeKey: string, tokens: string[]): Promise<void>;
  takePrivateToken(scopeKey: string): Promise<string | undefined>;
  countPrivateTokens(scopeKey: string): Promise<number>;
}

/** Complete storage contract accepted by `createCurvyConfig`. */
export type CurvyStorage = StorageLifecycleStore &
  AccountStore &
  CurrencyStore &
  BalanceStore &
  NotesStore &
  HistoryStore &
  TransferStore &
  PreferenceStore &
  PrivateTokenStore;

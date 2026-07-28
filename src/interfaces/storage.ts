import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { CurvyAccountData, HexString, PriceData, SerializedCurvyAccount } from "@/types";
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
} from "@/types/storage";

export interface StorageInterface {
  /**
   * Clear chain-derived wallet cache while preserving account metadata, prices,
   * finalized transaction history, transfer workflow records, preferences, and
   * Privacy Pass tokens.
   */
  clearCachedData(): Promise<void>;

  /** Destructively clear every SDK-owned storage table. */
  clearStorage(): Promise<void>;

  /** Atomically persist a notes-tree delta and its checkpoint when supported. */
  runInNotesTransaction<T>(fn: () => Promise<T>): Promise<T>;

  /** Persist a registered account's (key-free) metadata. Resets scan cursors. Throws if the id already exists. */
  insertCurvyAccount(account: SerializedCurvyAccount): Promise<void>;
  /**
   * Idempotently persist a registered account's (key-free) metadata: insert it
   * (initialising scan cursors) when absent, or merge the metadata into the
   * existing record (preserving scan cursors) when present. Safe to call on a
   * repeat login / session restore.
   */
  upsertCurvyAccount(account: SerializedCurvyAccount): Promise<void>;
  updateCurvyAccountData(accountId: string, changes: Partial<CurvyAccountData>): Promise<void>;
  /**
   * Wholesale-replace an account's data (the caller supplies the complete record).
   * Unlike `updateCurvyAccountData` this does NOT deep-merge, so it correctly
   * overwrites array/map fields (`pendingNotes`, `discoveryCursors`) and honours
   * removed keys — deep-merging those would corrupt arrays and leak stale entries.
   */
  replaceCurvyAccountData(accountId: string, data: CurvyAccountData): Promise<void>;
  getCurvyAccountDataById(id: string): Promise<CurvyAccountData>;

  upsertCurrencyMetadata(metadata: Map<string, CurrencyMetadata>): Promise<void>;
  /**
   * Gets the metadata for a specific currency on a specific network.
   * @param addressOrId The address / vaultTokenId of the currency.
   * @param networkSlug The slug of the network.
   */
  getCurrencyMetadata(addressOrId: string | bigint, networkSlug: string): Promise<CurrencyMetadata>;

  upsertPriceData(data: Map<string, PriceData>): Promise<void>;
  /**
   * Gets the price data for a specific token.
   * @param token
   */
  getCurrencyPrice(token: string): Promise<PriceData>;
  /**
   * Gets the price feed for all supported tokens.
   */
  getPriceFeed(): Promise<Map<string, PriceData>>;

  /**
   * Updates the balances and total balances for a given account based on the provided balance entries.
   * @param accountId The ID of the account to update balances for.
   * @param networkSlug Network slug of the balance entries.
   * @param entries The balance entries to update.
   */
  updateBalanceEntries(accountId: string, networkSlug: string, entries: BalanceEntry[]): Promise<void>;

  /**
   * Removes balance entries that have been spent from the storage.
   * @param entries - The balance entries to remove.
   */
  removeSpentBalanceEntries(entries: BalanceEntry[]): Promise<void>;

  /**
   * Gets all balances for the specified account
   * @param {string} [accountId = activeAccountId] The ID of the account to get balances for.
   * @param {NETWORK_ENVIRONMENT_VALUES} [environment] Optional filter for network environment (e.g., "mainnet", "testnet").
   * */
  getBalances(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<BalanceEntry[]>;

  /**
   * Gets the total balances grouped by currency for the specified account.
   * @param {string} [accountId = activeAccountId] The ID of the account to get total balances for.
   * @param {NETWORK_ENVIRONMENT_VALUES} [environment] Optional filter for network environment (e.g., "mainnet", "testnet").
   */
  getTotals(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<TotalBalance[]>;

  /**
   * Gets all balances for the specified account and currency on a specific network.
   * @param accountId The ID of the account to get balances for.
   * @param currencyAddress The address of the currency.
   * @param networkSlug The slug of the network.
   */
  getBalancesByCurrencyAndNetwork(
    accountId: string,
    currencyAddress: HexString,
    networkSlug: string,
  ): Promise<BalanceEntry[]>;

  /**
   * Gets the per-network notes-tree sync checkpoint (cursors + last
   * chain-verified root), or `null` if the network has never synced.
   * Account-independent — keyed by `(networkSlug, environment)`.
   */
  getNotesCheckpoint(networkSlug: string, environment: NETWORK_ENVIRONMENT_VALUES): Promise<NotesCheckpoint | null>;

  /** Upserts the notes-tree checkpoint for `(checkpoint.networkSlug, checkpoint.environment)`. */
  putNotesCheckpoint(checkpoint: NotesCheckpoint): Promise<void>;

  /**
   * Append `items` (decimal-string ids) to a network's committed `kind` log
   * starting at `fromIndex` (the caller's cursor). The log is append-only and
   * stored chunked, so this rewrites only the tail chunk(s), never the whole log.
   * `fromIndex` MUST equal the current log length (the sync guarantees this);
   * implementations may assume contiguity.
   */
  appendCommittedLog(networkSlug: string, kind: CommittedLogKind, fromIndex: number, items: string[]): Promise<void>;

  /** The full ordered committed `kind` log (decimal strings) — rebuilds the IMT / nullifier set. */
  getCommittedLog(networkSlug: string, kind: CommittedLogKind): Promise<string[]>;

  /** The length of a network's committed `kind` log (the cursor). */
  getCommittedLogCount(networkSlug: string, kind: CommittedLogKind): Promise<number>;

  // ── Sharded notes tree (lean profile) ──────────────────────────────────────
  // Completed-shard roots (the cap's leaves), the per-owned-note witness state,
  // and the single mutable live shard. Together a few MB regardless of global
  // tree size — see plan-shardtree-curvy.md.

  /** All completed-shard roots (decimal strings) for a network, in shard order. */
  getShardRoots(networkSlug: string): Promise<string[]>;

  /**
   * Append completed-shard roots starting at `fromShard` (the caller's shard
   * cursor). Append-only; `fromShard` MUST equal the current stored count.
   */
  appendShardRoots(networkSlug: string, fromShard: number, roots: string[]): Promise<void>;

  /** All persisted owned-note witnesses for a network. */
  getNoteWitnesses(networkSlug: string): Promise<SerializedNoteWitness[]>;

  /** Upsert one owned-note witness (insert at discovery, update once at shard freeze). */
  putNoteWitness(witness: SerializedNoteWitness): Promise<void>;

  /** Remove a witness — its note was spent (nullifier observed). */
  deleteNoteWitness(networkSlug: string, noteId: string): Promise<void>;

  /** The live (still-filling) shard's leaves, or `null` before the first sync. */
  getLiveShard(networkSlug: string): Promise<LiveShardRecord | null>;

  /** Rewrite the live shard record (bounded at 2^shardHeight leaves). */
  putLiveShard(record: LiveShardRecord): Promise<void>;

  // ── Transaction history (chain-reconstructed, account-scoped) ──────────────

  /** Upsert history entries by `(accountId, id)` — re-running a sync is idempotent. */
  putTxHistory(entries: TxHistoryEntry[]): Promise<void>;

  /** An account's history, newest-first (`observedAt` desc), optionally per network. */
  getTxHistory(accountId: string, filter?: { networkSlug?: string }): Promise<TxHistoryEntry[]>;

  // ── Reversible hot projection ──────────────────────────────────────────────

  /** Atomically replace one network's disposable canonical hot suffix. */
  replaceHotOverlay(replacement: HotOverlayReplacement): Promise<void>;
  clearHotOverlay(networkSlug: string, accountId?: string): Promise<void>;
  getHotSyncState(networkSlug: string): Promise<HotSyncState | null>;
  getHotBlocks(networkSlug: string): Promise<HotBlockRecord[]>;
  getHotNoteStates(accountId: string, networkSlug: string): Promise<HotNoteState[]>;
  getProjectedBalances(accountId: string, networkSlug: string, policy: InputFinalityPolicy): Promise<BalanceEntry[]>;
  getBalanceBreakdown(accountId: string, networkSlug: string, currencyAddress: string): Promise<BalanceBreakdown>;

  putTransferIntent(intent: TransferHistoryRecord): Promise<void>;
  getTransferIntents(accountId: string, networkSlug?: string): Promise<TransferHistoryRecord[]>;
  putTransferAttempt(attempt: TransferAttempt): Promise<void>;
  getTransferAttempts(accountId: string, intentId: string): Promise<TransferAttempt[]>;
  putTransferSettlement(settlement: TransferSettlement): Promise<void>;
  getTransferSettlements(accountId: string, intentId: string): Promise<TransferSettlement[]>;
  putIntentDependencies(dependencies: IntentDependency[]): Promise<void>;
  getIntentDependencies(accountId: string): Promise<IntentDependency[]>;
  putFinalityPreference(preference: FinalityPreference): Promise<void>;
  getFinalityPreference(accountId: string, networkSlug: string): Promise<FinalityPreference>;

  // ── Privacy Pass token pouch (per redemption scope) ─────────────────────────
  // Opaque single-use tokens, deliberately NOT tied to any account: linking a
  // stored token to a handle would undo the unlinkability the tokens exist for.

  /** Append serialized (b64url) tokens to a scope's pouch. */
  appendPrivateTokens(scopeKey: string, tokens: string[]): Promise<void>;

  /** Remove and return one token, or `undefined` when the pouch is empty. */
  takePrivateToken(scopeKey: string): Promise<string | undefined>;

  /** Unspent tokens remaining in a scope's pouch. */
  countPrivateTokens(scopeKey: string): Promise<number>;
}

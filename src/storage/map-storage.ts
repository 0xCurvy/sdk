import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { CurvyAccountData, PriceData } from "@/types";
import type {
  BalanceEntry,
  CommittedLogKind,
  CurrencyMetadata,
  FinalityPreference,
  HotBlockRecord,
  HotNoteState,
  HotOverlayReplacement,
  HotSyncState,
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
import { BaseStorage } from "./base-storage";

/**
 * In-memory {@link BaseStorage} adapter backed by `Map`s. The default storage
 * for `createCurvyConfig`; data does not persist across reloads.
 */
export class MapStorage extends BaseStorage {
  readonly #accounts = new Map<string, CurvyAccountData>();
  readonly #balances = new Map<string, BalanceEntry>();
  readonly #totalBalances = new Map<string, TotalBalance>();
  readonly #prices = new Map<string, PriceData>();
  readonly #currencyMetadata = new Map<string, CurrencyMetadata>();
  readonly #notesCheckpoints = new Map<string, NotesCheckpoint>();
  readonly #logChunks = new Map<string, string[]>();
  // Per-network nested map (networkSlug → chunkIndex → items). A flat
  // `${networkSlug}-${chunkIndex}` key matched by string-prefix collides across
  // networks that share a prefix (e.g. "ethereum" vs "ethereum-sepolia"), so the
  // outer key is matched by equality and chunks are scoped per network.
  readonly #shardRootsChunks = new Map<string, Map<number, string[]>>();
  readonly #noteWitnesses = new Map<string, SerializedNoteWitness>();
  readonly #liveShards = new Map<string, LiveShardRecord>();
  readonly #txHistory = new Map<string, TxHistoryEntry>();
  readonly #tokenPouches = new Map<string, string[]>();
  readonly #hotOverlays = new Map<string, { state: HotSyncState; blocks: HotBlockRecord[] }>();
  readonly #hotNoteStates = new Map<string, HotNoteState>();
  readonly #transferIntents = new Map<string, TransferHistoryRecord>();
  readonly #transferAttempts = new Map<string, TransferAttempt>();
  readonly #transferSettlements = new Map<string, TransferSettlement>();
  readonly #intentDependencies = new Map<string, IntentDependency>();
  readonly #finalityPreferences = new Map<string, FinalityPreference>();

  // ── Key helpers ──
  #balanceKey(e: { accountId: string; id: string; currencyAddress: string; networkSlug: string }): string {
    return `${e.accountId}-${e.id}-${e.currencyAddress}-${e.networkSlug}`;
  }
  #totalKey(e: { accountId: string; currencyAddress: string; networkSlug: string }): string {
    return `${e.accountId}-${e.currencyAddress}-${e.networkSlug}`;
  }
  #currencyKey(address: string, networkSlug: string): string {
    return `${address}-${networkSlug}`;
  }
  #checkpointKey(networkSlug: string, environment: NETWORK_ENVIRONMENT_VALUES): string {
    return `${networkSlug}-${environment}`;
  }
  #logChunkKey(networkSlug: string, kind: CommittedLogKind, chunkIndex: number): string {
    return `${networkSlug}-${kind}-${chunkIndex}`;
  }
  #noteWitnessKey(networkSlug: string, noteId: string): string {
    return `${networkSlug}-${noteId}`;
  }
  #txHistoryKey(accountId: string, id: string): string {
    return `${accountId}-${id}`;
  }
  #accountNetworkKey(accountId: string, networkSlug: string, suffix = ""): string {
    return `${accountId}\u0000${networkSlug}\u0000${suffix}`;
  }

  // ── Accounts ──
  protected async _getAccount(id: string) {
    return this.#accounts.get(id);
  }
  protected async _putAccount(id: string, data: CurvyAccountData) {
    this.#accounts.set(id, data);
  }
  protected async _hasAccount(id: string) {
    return this.#accounts.has(id);
  }

  // ── Balances ──
  protected async _getBalancesByAccountAndNetwork(accountId: string, networkSlug: string) {
    const results: BalanceEntry[] = [];
    for (const entry of this.#balances.values()) {
      if (entry.accountId === accountId && entry.networkSlug === networkSlug) results.push(entry);
    }
    return results;
  }
  protected async _putBalances(entries: BalanceEntry[]) {
    for (const entry of entries) this.#balances.set(this.#balanceKey(entry), entry);
  }
  protected async _deleteBalances(entries: BalanceEntry[]) {
    for (const entry of entries) this.#balances.delete(this.#balanceKey(entry));
  }
  protected async _queryBalances(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES) {
    return Array.from(this.#balances.values()).filter(
      (b) => b.accountId === accountId && (!environment || b.environment === environment),
    );
  }
  protected async _queryBalancesByCurrency(accountId: string, currencyAddress: string, networkSlug: string) {
    return Array.from(this.#balances.values()).filter(
      (b) => b.accountId === accountId && b.currencyAddress === currencyAddress && b.networkSlug === networkSlug,
    );
  }

  // ── Total balances ──
  protected async _getTotalBalance(accountId: string, currencyAddress: string, networkSlug: string) {
    return this.#totalBalances.get(this.#totalKey({ accountId, currencyAddress, networkSlug }));
  }
  protected async _putTotalBalance(total: TotalBalance) {
    this.#totalBalances.set(this.#totalKey(total), total);
  }
  protected async _deleteTotalBalance(accountId: string, currencyAddress: string, networkSlug: string) {
    this.#totalBalances.delete(this.#totalKey({ accountId, currencyAddress, networkSlug }));
  }
  protected async _queryTotals(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES) {
    return Array.from(this.#totalBalances.values()).filter(
      (t) => t.accountId === accountId && (!environment || t.environment === environment),
    );
  }

  // ── Prices ──
  protected async _putPrices(data: Map<string, PriceData>) {
    this.#prices.clear();
    for (const [key, value] of data) this.#prices.set(key, value);
  }
  protected async _getPrice(token: string) {
    return this.#prices.get(token);
  }
  protected async _getAllPrices() {
    return this.#prices;
  }

  // ── Currency metadata ──
  protected async _putCurrencyMetadata(metadata: CurrencyMetadata[]) {
    this.#currencyMetadata.clear();
    for (const m of metadata) this.#currencyMetadata.set(this.#currencyKey(m.address, m.networkSlug), m);
  }
  protected async _getCurrencyMetadataByAddress(address: string, networkSlug: string) {
    return this.#currencyMetadata.get(this.#currencyKey(address, networkSlug));
  }
  protected async _getAllCurrencyMetadata() {
    return Array.from(this.#currencyMetadata.values());
  }

  // ── Notes tree ──
  protected async _getNotesCheckpoint(networkSlug: string, environment: NETWORK_ENVIRONMENT_VALUES) {
    return this.#notesCheckpoints.get(this.#checkpointKey(networkSlug, environment));
  }
  protected async _putNotesCheckpoint(checkpoint: NotesCheckpoint) {
    this.#notesCheckpoints.set(this.#checkpointKey(checkpoint.networkSlug, checkpoint.environment), checkpoint);
  }
  protected async _getLogChunk(networkSlug: string, kind: CommittedLogKind, chunkIndex: number) {
    return this.#logChunks.get(this.#logChunkKey(networkSlug, kind, chunkIndex));
  }
  protected async _putLogChunk(networkSlug: string, kind: CommittedLogKind, chunkIndex: number, items: string[]) {
    this.#logChunks.set(this.#logChunkKey(networkSlug, kind, chunkIndex), [...items]);
  }
  protected async _getAllLogChunks(networkSlug: string, kind: CommittedLogKind) {
    const prefix = `${networkSlug}-${kind}-`;
    const chunks: Array<{ index: number; items: string[] }> = [];
    for (const [key, items] of this.#logChunks) {
      if (key.startsWith(prefix)) chunks.push({ index: Number(key.slice(prefix.length)), items });
    }
    return chunks.sort((a, b) => a.index - b.index).map((c) => c.items);
  }

  // ── Sharded notes tree ──
  protected async _getShardRootsChunk(networkSlug: string, chunkIndex: number) {
    return this.#shardRootsChunks.get(networkSlug)?.get(chunkIndex);
  }
  protected async _putShardRootsChunk(networkSlug: string, chunkIndex: number, items: string[]) {
    let perNetwork = this.#shardRootsChunks.get(networkSlug);
    if (!perNetwork) {
      perNetwork = new Map<number, string[]>();
      this.#shardRootsChunks.set(networkSlug, perNetwork);
    }
    perNetwork.set(chunkIndex, [...items]);
  }
  protected async _getAllShardRootsChunks(networkSlug: string) {
    const perNetwork = this.#shardRootsChunks.get(networkSlug);
    if (!perNetwork) return [];
    return Array.from(perNetwork.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, items]) => items);
  }
  protected async _getNoteWitnesses(networkSlug: string) {
    return Array.from(this.#noteWitnesses.values()).filter((w) => w.networkSlug === networkSlug);
  }
  protected async _putNoteWitness(witness: SerializedNoteWitness) {
    this.#noteWitnesses.set(this.#noteWitnessKey(witness.networkSlug, witness.noteId), witness);
  }
  protected async _deleteNoteWitness(networkSlug: string, noteId: string) {
    this.#noteWitnesses.delete(this.#noteWitnessKey(networkSlug, noteId));
  }
  protected async _getLiveShard(networkSlug: string) {
    return this.#liveShards.get(networkSlug);
  }
  protected async _putLiveShard(record: LiveShardRecord) {
    this.#liveShards.set(record.networkSlug, record);
  }

  // ── Transaction history ──
  protected async _putTxHistoryEntries(entries: TxHistoryEntry[]) {
    for (const entry of entries) this.#txHistory.set(this.#txHistoryKey(entry.accountId, entry.id), entry);
  }
  protected async _getTxHistoryByAccount(accountId: string) {
    return Array.from(this.#txHistory.values()).filter((e) => e.accountId === accountId);
  }

  // ── Reversible hot projection + workflow history ──
  protected async _replaceHotOverlay(replacement: HotOverlayReplacement) {
    await this._clearHotOverlay(replacement.state.networkSlug);
    this.#hotOverlays.set(replacement.state.networkSlug, {
      state: replacement.state,
      blocks: [...replacement.blocks],
    });
    for (const note of replacement.noteStates ?? []) {
      this.#hotNoteStates.set(this.#accountNetworkKey(note.accountId, note.networkSlug, note.noteId), note);
    }
    for (const entry of replacement.history ?? []) {
      this.#txHistory.set(this.#txHistoryKey(entry.accountId, entry.id), entry);
    }
  }
  protected async _clearHotOverlay(networkSlug: string, _accountId?: string) {
    this.#hotOverlays.delete(networkSlug);
    for (const [key, note] of this.#hotNoteStates) {
      if (note.networkSlug === networkSlug) this.#hotNoteStates.delete(key);
    }
    // One global hot head invalidates every account projection built on it.
    for (const [key, entry] of this.#txHistory) {
      if (entry.networkSlug === networkSlug && entry.finality === "hot") {
        this.#txHistory.delete(key);
      }
    }
  }
  protected async _getHotSyncState(networkSlug: string) {
    return this.#hotOverlays.get(networkSlug)?.state;
  }
  protected async _getHotBlocks(networkSlug: string) {
    return [...(this.#hotOverlays.get(networkSlug)?.blocks ?? [])].sort((a, b) => a.number - b.number);
  }
  protected async _getHotNoteStates(accountId: string, networkSlug: string) {
    return Array.from(this.#hotNoteStates.values()).filter(
      (note) => note.accountId === accountId && note.networkSlug === networkSlug,
    );
  }
  protected async _putTransferIntent(intent: TransferHistoryRecord) {
    this.#transferIntents.set(this.#accountNetworkKey(intent.accountId, intent.intentId), intent);
  }
  protected async _getTransferIntents(accountId: string) {
    return Array.from(this.#transferIntents.values()).filter((intent) => intent.accountId === accountId);
  }
  protected async _putTransferAttempt(attempt: TransferAttempt) {
    this.#transferAttempts.set(
      this.#accountNetworkKey(attempt.accountId, attempt.intentId, String(attempt.generation)),
      attempt,
    );
  }
  protected async _getTransferAttempts(accountId: string, intentId: string) {
    return Array.from(this.#transferAttempts.values()).filter(
      (attempt) => attempt.accountId === accountId && attempt.intentId === intentId,
    );
  }
  protected async _putTransferSettlement(settlement: TransferSettlement) {
    this.#transferSettlements.set(
      this.#accountNetworkKey(settlement.accountId, settlement.intentId, settlement.outputCommitment),
      settlement,
    );
  }
  protected async _getTransferSettlements(accountId: string, intentId: string) {
    return Array.from(this.#transferSettlements.values()).filter(
      (settlement) => settlement.accountId === accountId && settlement.intentId === intentId,
    );
  }
  protected async _putIntentDependencies(dependencies: IntentDependency[]) {
    for (const dependency of dependencies) {
      this.#intentDependencies.set(
        `${dependency.accountId}\u0000${dependency.fromIntentId}\u0000${dependency.toIntentId}\u0000${dependency.noteId}`,
        dependency,
      );
    }
  }
  protected async _getIntentDependencies(accountId: string) {
    return Array.from(this.#intentDependencies.values()).filter((dependency) => dependency.accountId === accountId);
  }
  protected async _putFinalityPreference(preference: FinalityPreference) {
    this.#finalityPreferences.set(this.#accountNetworkKey(preference.accountId, preference.networkSlug), preference);
  }
  protected async _getFinalityPreference(accountId: string, networkSlug: string) {
    return this.#finalityPreferences.get(this.#accountNetworkKey(accountId, networkSlug));
  }

  // ── Privacy Pass token pouch ──
  protected async _getTokenPouch(scopeKey: string) {
    return this.#tokenPouches.get(scopeKey);
  }
  protected async _putTokenPouch(scopeKey: string, tokens: string[]) {
    if (tokens.length === 0) this.#tokenPouches.delete(scopeKey);
    else this.#tokenPouches.set(scopeKey, [...tokens]);
  }

  // ── Lifecycle ──
  protected async _runInNotesTransaction<T>(fn: () => Promise<T>) {
    return fn();
  }

  protected async _clearCachedData() {
    this.#balances.clear();
    this.#totalBalances.clear();
    this.#notesCheckpoints.clear();
    this.#logChunks.clear();
    this.#shardRootsChunks.clear();
    this.#noteWitnesses.clear();
    this.#liveShards.clear();
    this.#hotOverlays.clear();
    this.#hotNoteStates.clear();

    for (const [key, entry] of this.#txHistory) {
      if (entry.finality === "hot") this.#txHistory.delete(key);
    }
    for (const [id, account] of this.#accounts) {
      this.#accounts.set(id, {
        ...account,
        scanCursors: { latest: undefined, oldest: undefined },
        discoveryCursors: {},
      });
    }
  }

  protected async _clearAll() {
    this.#accounts.clear();
    this.#balances.clear();
    this.#totalBalances.clear();
    this.#prices.clear();
    this.#currencyMetadata.clear();
    this.#notesCheckpoints.clear();
    this.#logChunks.clear();
    this.#shardRootsChunks.clear();
    this.#noteWitnesses.clear();
    this.#liveShards.clear();
    this.#txHistory.clear();
    this.#tokenPouches.clear();
    this.#hotOverlays.clear();
    this.#hotNoteStates.clear();
    this.#transferIntents.clear();
    this.#transferAttempts.clear();
    this.#transferSettlements.clear();
    this.#intentDependencies.clear();
    this.#finalityPreferences.clear();
  }

  /** Entry counts per store — a debugging/monitoring aid. */
  stats() {
    return {
      accounts: this.#accounts.size,
      balances: this.#balances.size,
      totalBalances: this.#totalBalances.size,
      prices: this.#prices.size,
      currencyMetadata: this.#currencyMetadata.size,
      notesCheckpoints: this.#notesCheckpoints.size,
      logChunks: this.#logChunks.size,
      shardRootsChunks: Array.from(this.#shardRootsChunks.values()).reduce((n, m) => n + m.size, 0),
      noteWitnesses: this.#noteWitnesses.size,
      liveShards: this.#liveShards.size,
      txHistory: this.#txHistory.size,
      tokenPouches: this.#tokenPouches.size,
      hotOverlays: this.#hotOverlays.size,
      hotNoteStates: this.#hotNoteStates.size,
      transferIntents: this.#transferIntents.size,
      transferAttempts: this.#transferAttempts.size,
      transferSettlements: this.#transferSettlements.size,
      intentDependencies: this.#intentDependencies.size,
      finalityPreferences: this.#finalityPreferences.size,
    };
  }
}

import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { CurvyAccountData, PriceData } from "@/types";
import type {
  BalanceEntry,
  CommittedLogKind,
  CurrencyMetadata,
  LiveShardRecord,
  NotesCheckpoint,
  SerializedNoteWitness,
  TotalBalance,
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

  // ── Lifecycle ──
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
    };
  }
}

import { DEFAULT_DB_NAME } from "@/constants/db";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { BaseStorage } from "@/storage/base-storage";
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
import { CurvyDatabase } from "./database";

/**
 * IndexedDB storage adapter backed by Dexie. Persists across reloads — the
 * production default for browser apps.
 *
 * @example
 * import { IndexedDBStorage } from "@0xcurvy/curvy-sdk/storage/idb";
 *
 * const config = await createCurvyConfig({ storage: new IndexedDBStorage() });
 */
export class IndexedDBStorage extends BaseStorage {
  readonly db: CurvyDatabase;

  constructor(dbOrName: CurvyDatabase | string = DEFAULT_DB_NAME) {
    super();
    this.db = typeof dbOrName === "string" ? new CurvyDatabase(dbOrName) : dbOrName;
  }

  // ── Accounts ──
  protected async _getAccount(id: string) {
    return this.db.accounts.get(id);
  }
  protected async _putAccount(_id: string, data: CurvyAccountData) {
    await this.db.accounts.put(data);
  }
  protected async _hasAccount(id: string) {
    return (await this.db.accounts.get(id)) !== undefined;
  }

  // ── Balances ──
  protected async _getBalancesByAccountAndNetwork(accountId: string, networkSlug: string) {
    return this.db.balances.where({ accountId, networkSlug }).toArray();
  }
  protected async _putBalances(entries: BalanceEntry[]) {
    if (entries.length > 0) await this.db.balances.bulkPut(entries);
  }
  protected async _deleteBalances(entries: BalanceEntry[]) {
    if (entries.length > 0) {
      await this.db.balances.bulkDelete(entries.map((e) => [e.accountId, e.currencyAddress, e.networkSlug, e.id]));
    }
  }
  protected async _queryBalances(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES) {
    if (environment) return this.db.balances.where({ accountId, environment }).toArray();
    return this.db.balances.where({ accountId }).toArray();
  }
  protected async _queryBalancesByCurrency(accountId: string, currencyAddress: string, networkSlug: string) {
    return this.db.balances.where({ accountId, currencyAddress, networkSlug }).toArray();
  }

  // ── Total balances ──
  protected async _getTotalBalance(accountId: string, currencyAddress: string, networkSlug: string) {
    return this.db.totalBalances.get([accountId, currencyAddress, networkSlug]);
  }
  protected async _putTotalBalance(total: TotalBalance) {
    await this.db.totalBalances.put(total);
  }
  protected async _deleteTotalBalance(accountId: string, currencyAddress: string, networkSlug: string) {
    await this.db.totalBalances.delete([accountId, currencyAddress, networkSlug]);
  }
  protected async _queryTotals(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES) {
    if (environment) return this.db.totalBalances.where({ accountId, environment }).toArray();
    return this.db.totalBalances.where({ accountId }).toArray();
  }

  // ── Prices (replace-all semantics) ──
  protected async _putPrices(data: Map<string, PriceData>) {
    await this.db.prices.clear();
    if (data.size > 0) await this.db.prices.bulkPut([...data.values()], [...data.keys()]);
  }
  protected async _getPrice(token: string) {
    return this.db.prices.get(token);
  }
  protected async _getAllPrices() {
    const collection = this.db.prices.toCollection();
    const keys = await collection.keys();
    const values = await collection.toArray();
    return new Map(keys.map((key, i) => [key as string, values[i]]));
  }

  // ── Currency metadata (replace-all semantics) ──
  protected async _putCurrencyMetadata(metadata: CurrencyMetadata[]) {
    await this.db.currencyMetadata.clear();
    if (metadata.length > 0) await this.db.currencyMetadata.bulkPut(metadata);
  }
  protected async _getCurrencyMetadataByAddress(address: string, networkSlug: string) {
    return this.db.currencyMetadata.get([address, networkSlug]);
  }
  protected async _getAllCurrencyMetadata() {
    return this.db.currencyMetadata.toArray();
  }

  // ── Notes tree ──
  protected async _getNotesCheckpoint(networkSlug: string, environment: NETWORK_ENVIRONMENT_VALUES) {
    return this.db.notesCheckpoints.get([networkSlug, environment]);
  }
  protected async _putNotesCheckpoint(checkpoint: NotesCheckpoint) {
    await this.db.notesCheckpoints.put(checkpoint);
  }
  protected async _getLogChunk(networkSlug: string, kind: CommittedLogKind, chunkIndex: number) {
    return (await this.db.committedLog.get([networkSlug, kind, chunkIndex]))?.items;
  }
  protected async _putLogChunk(networkSlug: string, kind: CommittedLogKind, chunkIndex: number, items: string[]) {
    await this.db.committedLog.put({ networkSlug, kind, chunkIndex, items });
  }
  protected async _getAllLogChunks(networkSlug: string, kind: CommittedLogKind) {
    const rows = await this.db.committedLog.where({ networkSlug, kind }).toArray();
    return rows.sort((a, b) => a.chunkIndex - b.chunkIndex).map((r) => r.items);
  }

  // ── Sharded notes tree ──
  protected async _getShardRootsChunk(networkSlug: string, chunkIndex: number) {
    return (await this.db.shardRoots.get([networkSlug, chunkIndex]))?.items;
  }
  protected async _putShardRootsChunk(networkSlug: string, chunkIndex: number, items: string[]) {
    await this.db.shardRoots.put({ networkSlug, chunkIndex, items });
  }
  protected async _getAllShardRootsChunks(networkSlug: string) {
    const rows = await this.db.shardRoots.where({ networkSlug }).toArray();
    return rows.sort((a, b) => a.chunkIndex - b.chunkIndex).map((r) => r.items);
  }
  protected async _getNoteWitnesses(networkSlug: string) {
    return this.db.noteWitnesses.where({ networkSlug }).toArray();
  }
  protected async _putNoteWitness(witness: SerializedNoteWitness) {
    await this.db.noteWitnesses.put(witness);
  }
  protected async _deleteNoteWitness(networkSlug: string, noteId: string) {
    await this.db.noteWitnesses.delete([networkSlug, noteId]);
  }
  protected async _getLiveShard(networkSlug: string) {
    return this.db.liveShards.get(networkSlug);
  }
  protected async _putLiveShard(record: LiveShardRecord) {
    await this.db.liveShards.put(record);
  }

  // ── Transaction history ──
  protected async _putTxHistoryEntries(entries: TxHistoryEntry[]) {
    if (entries.length > 0) await this.db.txHistory.bulkPut(entries);
  }
  protected async _getTxHistoryByAccount(accountId: string) {
    return this.db.txHistory.where({ accountId }).toArray();
  }

  // ── Privacy Pass token pouch ──
  protected async _getTokenPouch(scopeKey: string) {
    return (await this.db.tokenPouches.get(scopeKey))?.tokens;
  }
  protected async _putTokenPouch(scopeKey: string, tokens: string[]) {
    if (tokens.length === 0) await this.db.tokenPouches.delete(scopeKey);
    else await this.db.tokenPouches.put({ scopeKey, tokens });
  }

  /**
   * Atomic take: the read-modify-write runs in a Dexie rw transaction so two
   * tabs can't pop the SAME token (which the redeemer would 409 as a replay).
   */
  override async takePrivateToken(scopeKey: string): Promise<string | undefined> {
    return this.db.transaction("rw", this.db.tokenPouches, async () => {
      const pouch = await this.db.tokenPouches.get(scopeKey);
      if (!pouch || pouch.tokens.length === 0) return undefined;
      const [token, ...rest] = pouch.tokens;
      if (rest.length === 0) await this.db.tokenPouches.delete(scopeKey);
      else await this.db.tokenPouches.put({ scopeKey, tokens: rest });
      return token;
    });
  }

  // ── Lifecycle ──
  protected async _clearAll() {
    await Promise.all([
      this.db.accounts.clear(),
      this.db.balances.clear(),
      this.db.totalBalances.clear(),
      this.db.prices.clear(),
      this.db.currencyMetadata.clear(),
      this.db.notesCheckpoints.clear(),
      this.db.committedLog.clear(),
      this.db.shardRoots.clear(),
      this.db.noteWitnesses.clear(),
      this.db.liveShards.clear(),
      this.db.txHistory.clear(),
      this.db.tokenPouches.clear(),
    ]);
  }

  /** Wrap balance mutations in a Dexie read-write transaction for atomicity. */
  protected override async _transaction(fn: () => Promise<void>) {
    await this.db.transaction("rw", this.db.balances, this.db.totalBalances, fn);
  }
}

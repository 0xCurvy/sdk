import merge from "lodash.merge";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { StorageError } from "@/errors";
import type { StorageInterface } from "@/interfaces/storage";
import type { CurvyAccountData, PriceData, SerializedCurvyAccount } from "@/types";
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

type TokenAgg = { sum: bigint; environment: NETWORK_ENVIRONMENT_VALUES; symbol: string };

/**
 * Committed-log chunk size. A delta sync rewrites only the chunk(s) the new
 * items land in, so full earlier chunks are immutable once sealed — the
 * IndexedDB write stays O(delta + tail), not O(total). Power of two so a sealed
 * chunk is also a clean subtree boundary if checkpoints are added later.
 */
const LOG_CHUNK_SIZE = 1024;

/**
 * Abstract base for storage adapters. Implements ALL of {@link StorageInterface}'s
 * business logic — balance delta tracking, total-balance computation, the
 * currency-metadata `vaultTokenId` lookup, validation — on top of a small set of
 * raw CRUD primitives that subclasses provide. A new backend (in-memory, IndexedDB,
 * OPFS, SQLite…) only needs to implement the `_`-prefixed primitives.
 *
 * @example
 * class MyStorage extends BaseStorage {
 *   protected async _getAccount(id: string) { ... }
 *   // …implement the remaining primitives
 * }
 */
export abstract class BaseStorage implements StorageInterface {
  // ──────────────────────────────────────────────
  // Abstract primitives — implemented by subclasses
  // ──────────────────────────────────────────────

  // --- Accounts ---
  protected abstract _getAccount(id: string): Promise<CurvyAccountData | undefined>;
  protected abstract _putAccount(id: string, data: CurvyAccountData): Promise<void>;
  protected abstract _hasAccount(id: string): Promise<boolean>;

  // --- Balances ---
  protected abstract _getBalancesByAccountAndNetwork(accountId: string, networkSlug: string): Promise<BalanceEntry[]>;
  protected abstract _putBalances(entries: BalanceEntry[]): Promise<void>;
  protected abstract _deleteBalances(entries: BalanceEntry[]): Promise<void>;
  protected abstract _queryBalances(
    accountId: string,
    environment?: NETWORK_ENVIRONMENT_VALUES,
  ): Promise<BalanceEntry[]>;
  protected abstract _queryBalancesByCurrency(
    accountId: string,
    currencyAddress: string,
    networkSlug: string,
  ): Promise<BalanceEntry[]>;

  // --- Total balances ---
  protected abstract _getTotalBalance(
    accountId: string,
    currencyAddress: string,
    networkSlug: string,
  ): Promise<TotalBalance | undefined>;
  protected abstract _putTotalBalance(total: TotalBalance): Promise<void>;
  protected abstract _deleteTotalBalance(
    accountId: string,
    currencyAddress: string,
    networkSlug: string,
  ): Promise<void>;
  protected abstract _queryTotals(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<TotalBalance[]>;

  // --- Prices ---
  protected abstract _putPrices(data: Map<string, PriceData>): Promise<void>;
  protected abstract _getPrice(token: string): Promise<PriceData | undefined>;
  protected abstract _getAllPrices(): Promise<Map<string, PriceData>>;

  // --- Currency metadata ---
  protected abstract _putCurrencyMetadata(metadata: CurrencyMetadata[]): Promise<void>;
  protected abstract _getCurrencyMetadataByAddress(
    address: string,
    networkSlug: string,
  ): Promise<CurrencyMetadata | undefined>;
  protected abstract _getAllCurrencyMetadata(): Promise<CurrencyMetadata[]>;

  // --- Notes tree (per network, account-independent) ---
  protected abstract _getNotesCheckpoint(
    networkSlug: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
  ): Promise<NotesCheckpoint | undefined>;
  protected abstract _putNotesCheckpoint(checkpoint: NotesCheckpoint): Promise<void>;
  /** Read one committed-log chunk (decimal strings), or undefined if absent. */
  protected abstract _getLogChunk(
    networkSlug: string,
    kind: CommittedLogKind,
    chunkIndex: number,
  ): Promise<string[] | undefined>;
  protected abstract _putLogChunk(
    networkSlug: string,
    kind: CommittedLogKind,
    chunkIndex: number,
    items: string[],
  ): Promise<void>;
  /** All committed-log chunks for `(networkSlug, kind)`, ORDERED by chunkIndex. */
  protected abstract _getAllLogChunks(networkSlug: string, kind: CommittedLogKind): Promise<string[][]>;

  // --- Sharded notes tree (per network, account-independent) ---
  /** Read one shard-roots chunk (decimal strings), or undefined if absent. */
  protected abstract _getShardRootsChunk(networkSlug: string, chunkIndex: number): Promise<string[] | undefined>;
  protected abstract _putShardRootsChunk(networkSlug: string, chunkIndex: number, items: string[]): Promise<void>;
  /** All shard-roots chunks for `networkSlug`, ORDERED by chunkIndex. */
  protected abstract _getAllShardRootsChunks(networkSlug: string): Promise<string[][]>;
  /** All persisted owned-note witnesses for a network. */
  protected abstract _getNoteWitnesses(networkSlug: string): Promise<SerializedNoteWitness[]>;
  protected abstract _putNoteWitness(witness: SerializedNoteWitness): Promise<void>;
  protected abstract _deleteNoteWitness(networkSlug: string, noteId: string): Promise<void>;
  protected abstract _getLiveShard(networkSlug: string): Promise<LiveShardRecord | undefined>;
  protected abstract _putLiveShard(record: LiveShardRecord): Promise<void>;

  // --- Transaction history (account-scoped) ---
  /** Upsert history entries by `(accountId, id)`. */
  protected abstract _putTxHistoryEntries(entries: TxHistoryEntry[]): Promise<void>;
  /** All history entries for an account (UNORDERED — ordering/filtering is done in BaseStorage). */
  protected abstract _getTxHistoryByAccount(accountId: string): Promise<TxHistoryEntry[]>;

  // --- Privacy Pass token pouch ---
  protected abstract _getTokenPouch(scopeKey: string): Promise<string[] | undefined>;
  protected abstract _putTokenPouch(scopeKey: string, tokens: string[]): Promise<void>;

  // --- Lifecycle ---
  protected abstract _clearAll(): Promise<void>;

  /**
   * Override to wrap balance mutations in a transaction. Default: runs `fn`
   * directly (fine for in-memory storage).
   */
  protected async _transaction(fn: () => Promise<void>): Promise<void> {
    return fn();
  }

  // ──────────────────────────────────────────────
  // StorageInterface — concrete implementations
  // ──────────────────────────────────────────────

  async insertCurvyAccount(account: SerializedCurvyAccount): Promise<void> {
    if (await this._hasAccount(account.id)) {
      throw new StorageError(`Account with ID ${account.id} already exists in storage`);
    }
    await this._putAccount(account.id, {
      ...account,
      scanCursors: { latest: undefined, oldest: undefined },
    });
  }

  async upsertCurvyAccount(account: SerializedCurvyAccount): Promise<void> {
    // Re-adding an already-persisted account (repeat login, session restore)
    // must not throw — merge the metadata in, preserving scan cursors. Only a
    // first-time insert initialises them.
    if (await this._hasAccount(account.id)) {
      await this.updateCurvyAccountData(account.id, account);
    } else {
      await this.insertCurvyAccount(account);
    }
  }

  async updateCurvyAccountData(accountId: string, changes: Partial<CurvyAccountData>): Promise<void> {
    const existing = await this._getAccount(accountId);
    if (!existing) {
      throw new StorageError(`Account with ID ${accountId} not found in storage`);
    }
    await this._putAccount(accountId, merge(existing, changes));
  }

  async replaceCurvyAccountData(accountId: string, data: CurvyAccountData): Promise<void> {
    if (!(await this._hasAccount(accountId))) {
      throw new StorageError(`Account with ID ${accountId} not found in storage`);
    }
    await this._putAccount(accountId, data);
  }

  async getCurvyAccountDataById(id: string): Promise<CurvyAccountData> {
    const account = await this._getAccount(id);
    if (!account) {
      throw new StorageError(`Account with ID ${id} not found`);
    }
    return account;
  }

  async upsertCurrencyMetadata(metadata: Map<string, CurrencyMetadata>): Promise<void> {
    await this._putCurrencyMetadata([...metadata.values()]);
  }

  async getCurrencyMetadata(addressOrId: string | bigint, networkSlug: string): Promise<CurrencyMetadata> {
    let currencyMetadata: CurrencyMetadata | undefined;

    if (typeof addressOrId === "bigint") {
      // `vaultTokenId` is stored as a string (it is not indexable as a bigint),
      // so we scan and compare on its string form.
      const all = await this._getAllCurrencyMetadata();
      currencyMetadata = all.find((c) => c.vaultTokenId === addressOrId.toString() && c.networkSlug === networkSlug);
    } else {
      currencyMetadata = await this._getCurrencyMetadataByAddress(addressOrId, networkSlug);
    }

    if (!currencyMetadata) {
      throw new StorageError(
        `Currency metadata for address / vaultTokenId ${addressOrId} on network ${networkSlug} not found`,
      );
    }
    return currencyMetadata;
  }

  async upsertPriceData(data: Map<string, PriceData>): Promise<void> {
    await this._putPrices(data);
  }

  async getCurrencyPrice(token: string): Promise<PriceData> {
    const price = await this._getPrice(token);
    if (!price) {
      throw new StorageError(`Price for token ${token} not found`);
    }
    return price;
  }

  async getPriceFeed(): Promise<Map<string, PriceData>> {
    return this._getAllPrices();
  }

  async clearStorage(): Promise<void> {
    await this._clearAll();
  }

  async deleteBalanceEntries(entries: BalanceEntry[]): Promise<void> {
    if (entries.length > 0) await this._deleteBalances(entries);
  }

  async removeSpentBalanceEntries(balanceEntries: BalanceEntry[]): Promise<void> {
    if (balanceEntries.length === 0) return;

    const uniqueAccountIds = new Set(balanceEntries.map((b) => b.accountId));
    if (uniqueAccountIds.size > 1) {
      throw new StorageError("Tried to remove spent balance entries for multiple accounts at once");
    }
    const accountId = balanceEntries[0].accountId;

    // Remove ONLY the spent entries, preserving the account's other notes.
    // `updateBalanceEntries` has FULL-REPLACEMENT semantics per (account, network):
    // it deletes every existing entry absent from the set it is given. So we must
    // pass the SURVIVORS (existing minus spent), NOT just the spent entries — the
    // previous code passed only the spent ones, which deleted every OTHER note for
    // the network (and left the spent note as a balance-0 zombie), wiping the wallet
    // on each spend. The forward-only sync cursor can't re-discover those leaves, so
    // the loss is permanent without a full re-scan. Group by network because
    // `updateBalanceEntries` operates per (account, network).
    const spentByNetwork = new Map<string, Set<string>>();
    for (const entry of balanceEntries) {
      const ids = spentByNetwork.get(entry.networkSlug) ?? new Set<string>();
      ids.add(entry.id);
      spentByNetwork.set(entry.networkSlug, ids);
    }
    for (const [networkSlug, spentIds] of spentByNetwork) {
      const existing = await this._getBalancesByAccountAndNetwork(accountId, networkSlug);
      const survivors = existing.filter((entry) => !spentIds.has(entry.id));
      await this.updateBalanceEntries(accountId, networkSlug, survivors);
    }
  }

  async updateBalanceEntries(accountId: string, networkSlug: string, entries: BalanceEntry[]): Promise<void> {
    if (entries.length > 0 && !entries.every((e) => e.networkSlug === networkSlug && e.accountId === accountId)) {
      throw new StorageError("All entries must match the provided accountId and networkSlug");
    }

    await this._transaction(async () => {
      const oldEntries = await this._getBalancesByAccountAndNetwork(accountId, networkSlug);
      if (entries.length === 0 && oldEntries.length === 0) return;

      // Delete entries no longer present in the new set.
      const newIdSet = new Set(entries.map((e) => e.id));
      const entriesToDelete = oldEntries.filter((old) => !newIdSet.has(old.id));
      if (entriesToDelete.length > 0) await this._deleteBalances(entriesToDelete);

      // Apply total-balance deltas per (currency, network).
      const newByToken = BaseStorage.#groupByToken(entries);
      const oldByToken = BaseStorage.#groupByToken(oldEntries);
      for (const key of new Set([...newByToken.keys(), ...oldByToken.keys()])) {
        const [currencyAddress, tokenNetwork] = key.split("::");
        const newAgg = newByToken.get(key);
        const oldAgg = oldByToken.get(key);
        const agg = newAgg ?? oldAgg;
        if (!agg) continue;
        const delta = (newAgg?.sum ?? 0n) - (oldAgg?.sum ?? 0n);
        await this.#updateTotalBalance(accountId, currencyAddress, tokenNetwork, agg.environment, agg.symbol, delta);
      }

      await this._putBalances(entries);
    });
  }

  async getBalances(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<BalanceEntry[]> {
    return this._queryBalances(accountId, environment);
  }

  async getTotals(accountId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<TotalBalance[]> {
    return this._queryTotals(accountId, environment);
  }

  async getBalancesByCurrencyAndNetwork(
    accountId: string,
    currencyAddress: string,
    networkSlug: string,
  ): Promise<BalanceEntry[]> {
    return this._queryBalancesByCurrency(accountId, currencyAddress, networkSlug);
  }

  async getNotesCheckpoint(
    networkSlug: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
  ): Promise<NotesCheckpoint | null> {
    return (await this._getNotesCheckpoint(networkSlug, environment)) ?? null;
  }

  async putNotesCheckpoint(checkpoint: NotesCheckpoint): Promise<void> {
    await this._putNotesCheckpoint(checkpoint);
  }

  async appendCommittedLog(
    networkSlug: string,
    kind: CommittedLogKind,
    fromIndex: number,
    items: string[],
  ): Promise<void> {
    if (items.length === 0) return;
    // Group the new items by the chunk they land in; rewrite only those chunks.
    // Earlier full chunks are never touched (append-only log).
    await this.#appendChunked(
      (chunkIndex) => this._getLogChunk(networkSlug, kind, chunkIndex),
      (chunkIndex, chunk) => this._putLogChunk(networkSlug, kind, chunkIndex, chunk),
      fromIndex,
      items,
      `appendCommittedLog(${kind})`,
    );
  }

  async getCommittedLog(networkSlug: string, kind: CommittedLogKind): Promise<string[]> {
    return (await this._getAllLogChunks(networkSlug, kind)).flat();
  }

  async getCommittedLogCount(networkSlug: string, kind: CommittedLogKind): Promise<number> {
    return (await this._getAllLogChunks(networkSlug, kind)).reduce((n, c) => n + c.length, 0);
  }

  // ── Sharded notes tree ──

  async getShardRoots(networkSlug: string): Promise<string[]> {
    return (await this._getAllShardRootsChunks(networkSlug)).flat();
  }

  async appendShardRoots(networkSlug: string, fromShard: number, roots: string[]): Promise<void> {
    if (roots.length === 0) return;
    // Append-only: the new roots must start exactly at the current stored count.
    // Stored chunked (like the committed logs) so a delta only rewrites the tail
    // chunk(s); earlier full chunks are immutable once sealed.
    await this.#appendChunked(
      (chunkIndex) => this._getShardRootsChunk(networkSlug, chunkIndex),
      (chunkIndex, chunk) => this._putShardRootsChunk(networkSlug, chunkIndex, chunk),
      fromShard,
      roots,
      "appendShardRoots",
    );
  }

  /**
   * Chunked append-only writer shared by {@link appendCommittedLog} and
   * {@link appendShardRoots}: lands `items` starting at global `fromIndex`,
   * rewriting only the chunk(s) they touch and asserting each write is
   * contiguous with what is already stored (throws `<label>: non-contiguous …`).
   */
  async #appendChunked(
    read: (chunkIndex: number) => Promise<string[] | undefined>,
    write: (chunkIndex: number, items: string[]) => Promise<void>,
    fromIndex: number,
    items: string[],
    label: string,
  ): Promise<void> {
    let i = 0;
    while (i < items.length) {
      const globalIndex = fromIndex + i;
      const chunkIndex = Math.floor(globalIndex / LOG_CHUNK_SIZE);
      const offset = globalIndex % LOG_CHUNK_SIZE;
      const take = Math.min(LOG_CHUNK_SIZE - offset, items.length - i);

      const chunk = (await read(chunkIndex)) ?? [];
      if (chunk.length !== offset) {
        throw new StorageError(
          `${label}: non-contiguous append — chunk ${chunkIndex} has ${chunk.length} items, expected ${offset}`,
        );
      }
      for (let j = 0; j < take; j++) chunk.push(items[i + j]);
      await write(chunkIndex, chunk);
      i += take;
    }
  }

  async getNoteWitnesses(networkSlug: string): Promise<SerializedNoteWitness[]> {
    return this._getNoteWitnesses(networkSlug);
  }

  async putNoteWitness(witness: SerializedNoteWitness): Promise<void> {
    await this._putNoteWitness(witness);
  }

  async deleteNoteWitness(networkSlug: string, noteId: string): Promise<void> {
    await this._deleteNoteWitness(networkSlug, noteId);
  }

  async getLiveShard(networkSlug: string): Promise<LiveShardRecord | null> {
    return (await this._getLiveShard(networkSlug)) ?? null;
  }

  async putLiveShard(record: LiveShardRecord): Promise<void> {
    await this._putLiveShard(record);
  }

  // ── Transaction history ──

  async putTxHistory(entries: TxHistoryEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this._putTxHistoryEntries(entries);
  }

  async getTxHistory(accountId: string, filter?: { networkSlug?: string }): Promise<TxHistoryEntry[]> {
    let entries = await this._getTxHistoryByAccount(accountId);
    if (filter?.networkSlug) {
      entries = entries.filter((e) => e.networkSlug === filter.networkSlug);
    }
    // Newest-first by observedAt; tie-break by id (ascending) for determinism.
    return entries.sort((a, b) => b.observedAt - a.observedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  // ── Privacy Pass token pouch ──

  async appendPrivateTokens(scopeKey: string, tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    const existing = (await this._getTokenPouch(scopeKey)) ?? [];
    await this._putTokenPouch(scopeKey, [...existing, ...tokens]);
  }

  async takePrivateToken(scopeKey: string): Promise<string | undefined> {
    const existing = await this._getTokenPouch(scopeKey);
    if (!existing || existing.length === 0) return undefined;
    const [token, ...rest] = existing;
    await this._putTokenPouch(scopeKey, rest);
    return token;
  }

  async countPrivateTokens(scopeKey: string): Promise<number> {
    return ((await this._getTokenPouch(scopeKey)) ?? []).length;
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  async #updateTotalBalance(
    accountId: string,
    currencyAddress: string,
    networkSlug: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    symbol: string,
    delta: bigint,
  ): Promise<void> {
    if (delta === 0n) return;

    const current = await this._getTotalBalance(accountId, currencyAddress, networkSlug);
    const newValue = BigInt(current?.totalBalance || "0") + delta;

    if (newValue > 0n) {
      await this._putTotalBalance({
        accountId,
        currencyAddress,
        networkSlug,
        environment,
        symbol,
        totalBalance: newValue.toString(),
        lastUpdated: Date.now(),
      });
    } else {
      await this._deleteTotalBalance(accountId, currencyAddress, networkSlug);
    }
  }

  static #groupByToken(entries: BalanceEntry[]): Map<string, TokenAgg> {
    const map = new Map<string, TokenAgg>();
    for (const e of entries) {
      const key = `${e.currencyAddress}::${e.networkSlug}`;
      const existing = map.get(key);
      if (existing) existing.sum += BigInt(e.balance);
      else map.set(key, { sum: BigInt(e.balance), environment: e.environment, symbol: e.symbol });
    }
    return map;
  }
}

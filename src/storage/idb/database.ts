import Dexie, { type Table } from "dexie";
import { DEFAULT_DB_NAME } from "@/constants/db";
import type { CurvyAccountData } from "@/types";
import type {
  BalanceEntry,
  CommittedLogKind,
  CurrencyMetadata,
  FinalityPreference,
  HotBlockRecord,
  HotNoteState,
  HotSyncState,
  IntentDependency,
  LiveShardRecord,
  NotesCheckpoint,
  PriceData,
  SerializedNoteWitness,
  TotalBalance,
  TransferAttempt,
  TransferHistoryRecord,
  TransferSettlement,
  TxHistoryEntry,
} from "@/types/storage";

/** One row of a chunked committed log (leaf or nullifier ids, decimal strings). */
export type CommittedLogChunk = {
  networkSlug: string;
  kind: CommittedLogKind;
  chunkIndex: number;
  items: string[];
};

/** One row of a network's chunked completed-shard-roots log (decimal strings). */
export type ShardRootsChunk = {
  networkSlug: string;
  chunkIndex: number;
  items: string[];
};

/** Privacy Pass token pouch: one row per redemption scope, FIFO token list. */
export type TokenPouch = {
  scopeKey: string;
  tokens: string[];
};

/** One atomically replaceable public hot-chain snapshot per network. */
export type HotOverlayRecord = HotSyncState & {
  blocks: Array<Omit<HotBlockRecord, "networkSlug">>;
};

/**
 * Dexie schema for the Curvy SDK's IndexedDB storage. Subclass to add legacy
 * migrations or extra tables; {@link IndexedDBStorage} exposes the instance via
 * its `db` property for direct Dexie access.
 *
 * Note: `balance` / `vaultTokenId` are `bigint` and are stored (structured-clone
 * handles bigint) but never used as index key paths — all keys are strings.
 */
export class CurvyDatabase extends Dexie {
  accounts!: Table<CurvyAccountData, string>;
  balances!: Table<BalanceEntry, [string, string, string, string]>;
  totalBalances!: Table<TotalBalance, [string, string, string]>;
  prices!: Table<PriceData, string>;
  currencyMetadata!: Table<CurrencyMetadata, [string, string]>;
  notesCheckpoints!: Table<NotesCheckpoint, [string, string]>;
  committedLog!: Table<CommittedLogChunk, [string, string, number]>;
  shardRoots!: Table<ShardRootsChunk, [string, number]>;
  noteWitnesses!: Table<SerializedNoteWitness, [string, string]>;
  liveShards!: Table<LiveShardRecord, string>;
  txHistory!: Table<TxHistoryEntry, [string, string]>;
  tokenPouches!: Table<TokenPouch, string>;
  hotOverlays!: Table<HotOverlayRecord, string>;
  hotNoteStates!: Table<HotNoteState, [string, string, string]>;
  transferIntents!: Table<TransferHistoryRecord, [string, string]>;
  transferAttempts!: Table<TransferAttempt, [string, string, number]>;
  transferSettlements!: Table<TransferSettlement, [string, string, string]>;
  intentDependencies!: Table<IntentDependency, [string, string, string, string]>;
  finalityPreferences!: Table<FinalityPreference, [string, string]>;

  constructor(name = DEFAULT_DB_NAME) {
    super(name);

    this.version(1).stores({
      accounts: "id",
      balances:
        "[accountId+currencyAddress+networkSlug+id], [accountId+currencyAddress+networkSlug], [accountId+networkSlug], [accountId+environment], accountId",
      totalBalances: "[accountId+currencyAddress+networkSlug], [accountId+environment], accountId",
      // Outbound primary key (PriceData has no id field — the token is the key).
      prices: "",
      currencyMetadata: "[address+networkSlug]",
      notesCheckpoints: "[networkSlug+environment]",
      committedLog: "[networkSlug+kind+chunkIndex], [networkSlug+kind]",
      shardRoots: "[networkSlug+chunkIndex], networkSlug",
      noteWitnesses: "[networkSlug+noteId], networkSlug",
      liveShards: "networkSlug",
      txHistory: "[accountId+id], accountId, [accountId+networkSlug]",
      tokenPouches: "scopeKey",
      hotOverlays: "networkSlug",
      hotNoteStates: "[accountId+networkSlug+noteId], [accountId+networkSlug]",
      transferIntents: "[accountId+intentId], accountId, [accountId+networkSlug]",
      transferAttempts: "[accountId+intentId+generation], [accountId+intentId]",
      transferSettlements: "[accountId+intentId+outputCommitment], [accountId+intentId]",
      intentDependencies: "[accountId+fromIntentId+toIntentId+noteId], accountId",
      finalityPreferences: "[accountId+networkSlug]",
    });
  }
}

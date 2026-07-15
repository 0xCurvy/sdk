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
  hotSyncStates!: Table<HotSyncState, string>;
  hotBlocks!: Table<HotBlockRecord, [string, number]>;
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
      currencyMetadata: "[address+networkSlug], networkSlug",
    });

    // v2 added a (now-removed) single-blob notes-tree store; superseded by v3.
    this.version(2).stores({ notesTrees: "[networkSlug+environment]" });

    // v3: per-network sync checkpoint (small, mutable) + the committed leaf/
    // nullifier logs stored CHUNKED so a delta sync only rewrites the tail chunk.
    // The `[networkSlug+kind]` index lets us read a whole log in chunk order.
    this.version(3)
      .stores({
        notesTrees: null, // drop the superseded blob store
        notesCheckpoints: "[networkSlug+environment]",
        committedLog: "[networkSlug+kind+chunkIndex], [networkSlug+kind]",
      })
      .upgrade(() => {
        // No data migration: committed logs are public chain data and re-sync
        // cheaply from the indexer; the old blob (if any) is simply dropped.
      });

    // v4: the sharded notes-tree (lean profile) stores — completed-shard roots
    // (chunked, like committedLog, so a delta only rewrites the tail chunk), the
    // per-owned-note witness state (keyed by [networkSlug+noteId]), and the single
    // mutable live shard (one row per network). All derivable from chain data, so
    // no migration is needed.
    this.version(4).stores({
      shardRoots: "[networkSlug+chunkIndex], networkSlug",
      noteWitnesses: "[networkSlug+noteId], networkSlug",
      liveShards: "networkSlug",
    });

    // v5: account-scoped transaction history, reconstructed from the synced chain
    // feeds. Keyed by [accountId+id] (the deterministic id makes a re-sync an
    // upsert); the accountId and [accountId+networkSlug] indexes back the
    // per-account / per-network reads. Chain-derived, so no migration is needed.
    this.version(5).stores({
      txHistory: "[accountId+id], accountId, [accountId+networkSlug]",
    });

    // v6: Privacy Pass token pouches — single-use anonymous access tokens, one
    // FIFO row per redemption scope. Deliberately account-agnostic (tokens must
    // not be linkable to a handle). Refillable at will, so no migration.
    this.version(6).stores({
      tokenPouches: "scopeKey",
    });

    // v7 records the finalized block hash/checkpoint identity on notes
    // checkpoints. The key is unchanged; legacy rows remain readable but are
    // treated as untrusted until the next verified sync rewrites them.
    this.version(7).stores({
      notesCheckpoints: "[networkSlug+environment]",
    });

    // v8 isolates every reversible hot projection from the durable finalized base.
    this.version(8).stores({
      hotSyncStates: "networkSlug",
      hotBlocks: "[networkSlug+number], [networkSlug+hash], networkSlug",
      hotNoteStates: "[accountId+networkSlug+noteId], [accountId+networkSlug], [accountId+networkSlug+status]",
      transferIntents: "[accountId+intentId], accountId, [accountId+networkSlug], [accountId+status]",
      transferAttempts: "[accountId+intentId+generation], [accountId+intentId]",
      transferSettlements: "[accountId+intentId+outputCommitment], [accountId+intentId]",
      intentDependencies: "[accountId+fromIntentId+toIntentId+noteId], accountId, [accountId+toIntentId]",
      finalityPreferences: "[accountId+networkSlug]",
    });
  }
}

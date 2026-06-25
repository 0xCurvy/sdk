import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { HexString } from "@/types/helper";

type PriceData = {
  price: string;
  decimals: number;
};

type CurrencyMetadata = {
  address: string;
  vaultTokenId?: string;
  symbol: string;
  name: string;
  native?: boolean;
  decimals: number;
  iconUrl: string;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
};

type GenericBalanceEntry = {
  accountId: string;

  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;

  currencyAddress: string;
  vaultTokenId: bigint | null;
  symbol: string;
  decimals: number;
  balance: bigint;

  lastUpdated: number;
};

type BalanceEntry = GenericBalanceEntry & {
  source: HexString;
  id: string;

  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    };
    sharedSecret: string;
  };
  deliveryTag: { ephemeralKey: string; viewTag: string };

  /**
   * Slot of this note in the network's committed notes tree, or `null` while the
   * note is still PENDING (announced but not committed). Bridges the per-account
   * owned-note set to the global tree so a spend can build its inclusion proof
   * without re-scanning. Filled by the sync when the note's `CommittedNotes`
   * batch is ingested (`leafIndex = currentNoteIndex + i`, zeros skipped).
   */
  leafIndex?: number | null;
};

type TotalBalance = {
  accountId: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  symbol: string;
  networkSlug: string;
  currencyAddress: string;
  totalBalance: string;
  lastUpdated: number;
};

/**
 * The two append-only logs that reconstruct one network's GLOBAL notes tree:
 * `"leaf"` = committed note ids in tree order (rebuilds the IMT), `"nullifier"`
 * = the spend log. Both are public chain data, stored PLAINTEXT (encrypting them
 * would only slow the rebuild for no privacy gain — the prior plan's call).
 *
 * Stored CHUNKED so an incremental sync only rewrites the tail chunk(s), never
 * the whole log — the key IndexedDB optimization for browsers. `appendCommittedLog`
 * places items at explicit indices (the caller's cursor), so a delta is O(delta +
 * tail chunk), not O(total). The cursor itself lives in {@link NotesCheckpoint}.
 */
type CommittedLogKind = "leaf" | "nullifier";

/**
 * Small, mutable per-network sync checkpoint — rewritten every sync. Holds the
 * cursors (= log lengths) and the last root VERIFIED against a direct chain RPC
 * read (the trust anchor, never the indexer). The bulky logs live in chunked
 * storage (see {@link CommittedLogKind}); this stays tiny so frequent updates are
 * cheap. Account-independent: keyed by `(networkSlug, environment)`.
 */
type NotesCheckpoint = {
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  /** Committed-leaf cursor (== on-chain noteIndex when caught up). */
  leafCount: number;
  /** Nullifier (spend-log) cursor. */
  nullifierCount: number;
  /** Last root verified against chain RPC (decimal string). */
  root: string;
  /** Chain block the sync was verified at. */
  blockNumber: number;
  lastSynced: number;
  /** Completed-shard count of the sharded tree (sharded profile only). */
  shardCount?: number;
};

/**
 * Persisted witness state for one OWNED note in the sharded notes tree — the
 * per-note half of an inclusion proof. `withinShardSiblings` is `null` while
 * the note's shard is still live (the path is derived from the live shard on
 * demand) and is written EXACTLY ONCE when the shard completes; from then on
 * it is immutable forever (the tree only appends — frozen-left). The cap half
 * of the proof is shared and recomputed from the persisted shard roots.
 */
type SerializedNoteWitness = {
  networkSlug: string;
  /** Decimal-string note id (the tree leaf value). */
  noteId: string;
  /** Global slot in the on-chain notes tree. */
  leafIndex: number;
  /** `leafIndex >> shardHeight` — which shard holds the leaf. */
  shardIndex: number;
  /** The shardHeight within-shard siblings (decimal strings), or `null` while live. */
  withinShardSiblings: string[] | null;
};

/**
 * The single mutable shard of a network's sharded notes tree — the only leaf
 * data the sharded profile retains. Bounded by `2^shardHeight` entries and
 * rewritten whole each sync (small by construction); completed shards exist
 * only as their roots plus the frozen witness paths above.
 */
type LiveShardRecord = {
  networkSlug: string;
  /** Global leaf index of the live shard's slot 0. */
  startIndex: number;
  /** Decimal-string note ids, in tree order. */
  leaves: string[];
};

type TxHistoryKind = "receive" | "spend";

/**
 * One account-scoped transaction-history entry, derived from the synced chain
 * feeds (leaf + nullifier streams) — the chain-reconstruction fallback of the
 * history design (plan-shardtree-curvy.md §11). Entries are idempotent: the
 * deterministic `id` means re-running a sync upserts rather than duplicates.
 */
type TxHistoryEntry = {
  /** Deterministic: `${networkSlug}:${noteId}:${kind}`. */
  id: string;
  accountId: string;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  kind: TxHistoryKind;
  /** receive only — plaintext delivery = vault deposit (shield); encrypted = private transfer. */
  origin?: "deposit" | "transfer";
  /** Decimal-string note id. */
  noteId: string;
  /** Decimal strings (JSON/IndexedDB-safe). */
  amount: string;
  token: string;
  leafIndex?: number;
  /** The aggregation-request tx that announced the note — the user-action time. */
  requestTxHash?: string;
  blockNumber?: number;
  /** Client clock when the sync observed the event (chain gives order, not wall time). */
  observedAt: number;
};

export type {
  CurrencyMetadata,
  PriceData,
  GenericBalanceEntry,
  BalanceEntry,
  TotalBalance,
  NotesCheckpoint,
  CommittedLogKind,
  SerializedNoteWitness,
  LiveShardRecord,
  TxHistoryEntry,
  TxHistoryKind,
};

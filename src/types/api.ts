//#region API Types

//////////////////////////////////////////////////////////////////////////////
//
// API Types
//
//////////////////////////////////////////////////////////////////////////////

import type { NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import type { AggregatorRequestStatus } from "@/types/aggregator";
import type { CircuitConfig } from "@/types/core";
import type { CurvyId } from "@/types/curvy";
import type { HexString } from "@/types/helper";

type Currency = {
  id: number;
  name: string;
  symbol: string;
  coinmarketcapId: string;
  iconUrl: string;
  price: string | null;
  updatedAt: string;
  decimals: number;
  contractAddress: HexString;
  nativeCurrency: boolean;
  vaultTokenId: string | null;
  bridgeNetworkIdToCurrencyIdMap: Record<number, number>;
};

type Network = {
  id: number;
  name: string;
  alchemyName: string;
  slug: string;
  group: string; // @TODO: remove
  testnet: boolean;
  slip0044: number;
  flavour: NETWORK_FLAVOUR_VALUES;
  multiCallContractAddress: string;
  vaultContractAddress?: string;
  vaultContractVersion?: string;
  tokenMoverContractAddress?: string;
  tokenBridgeContractAddress?: string;
  minWrappingAmountInNative?: string;
  aggregatorContractAddress?: string;
  portalFactoryContractAddress?: string;
  portalProgramAddress?: string;
  nativeCurrency: string | null; // TODO: Why is this string?
  chainId: string;
  blockExplorerUrl: string;
  rpcUrl: string;
  currencies: Array<Currency>;
  feeCollectorAddress?: string;
  /**
   * Protocol-GLOBAL fields, NOT served on the `/networks` wire. `createCurvyConfig`
   * fetches them once from `/protocol` and re-attaches them onto each vault-enabled
   * network at bootstrap, so consumers keep reading them off the `Network` object.
   * (The legacy `/currency/latest` blob still stamps them per-network inline.)
   *
   * `feeCollector` — the protocol fee collector's Curvy keys (spend `S`, view `V`,
   *   BabyJubjub note-owner key); `aggregate` stealth-delivers the fee note to these,
   *   and `babyJubjubPublicKey` MUST equal the aggregator's on-chain `feeNotePublicKey`.
   * `*CircuitConfig` — ZK proving parameters tied to the deployed aggregator.
   */
  feeCollector?: FeeCollector;
  aggregationCircuitConfig?: CircuitConfig;
  withdrawCircuitConfig?: CircuitConfig;
  noteOwnershipCircuitConfig?: CircuitConfig;
};

/** The protocol fee collector's Curvy public keys (decimal `x.y` field-element pairs). */
type FeeCollector = { S: string; V: string; babyJubjubPublicKey: string };

/**
 * Protocol-global config served by `GET /protocol` — proving parameters (identical
 * across networks; tied to the deployed aggregator) + the fee collector. De-duplicated
 * out of the per-network blob the legacy `/currency/latest` returned.
 */
type ProtocolConfig = {
  proving: {
    aggregation: CircuitConfig;
    withdrawal: CircuitConfig;
    noteOwnership: CircuitConfig;
  };
  feeCollector?: FeeCollector;
};

/** One row of the `GET /prices` poll feed — the volatile currency fields, denormalized. */
type CurrencyPrice = {
  id: number;
  symbol: string;
  price: string | null;
  decimals: number;
  updatedAt: string;
};

//#endregion

//#region API Client Types

//////////////////////////////////////////////////////////////////////////////
//
// API Client Types
//
//////////////////////////////////////////////////////////////////////////////

type NetworksWithCurrenciesResponse = {
  data: Array<Network>;
  error: string | null;
};
type GetNetworksReturnType = Array<Network>;

/** `GET /prices` envelope. */
type PricesResponse = {
  data: Array<CurrencyPrice>;
  error: string | null;
};
/** `GET /protocol` envelope. */
type ProtocolResponse = {
  data: ProtocolConfig;
  error: string | null;
};

//#endregion

//#region User

type RegisterCurvyIdRequestBody = {
  handle: string;
  ownerAddress: string;
  publicKeys: {
    spendingKey: string;
    viewingKey: string;
    babyJubjubPublicKey: string;
  };
};
type RegisterCurvyIdReturnType =
  | {
      message?: string;
    }
  | {
      error?: string;
    };
type ResolveCurvyIdReturnType = {
  data: {
    createdAt: string;
    publicKeys: {
      spendingKey: string;
      viewingKey: string;
      babyJubjubPublicKey: string | null;
    };
  } | null;
  error?: string | null;
};
type GetCurvyIdByOwnerAddressResponse = {
  data: {
    handle: string;
  } | null;
  error?: string | null;
};
type GetCurvyIdByOwnerAddressReturnType = CurvyId | null;

//#endregion

//#region Aggregator

type SubmitWithdrawReturnType = { requestId: string; error?: string };
type SubmitAggregationReturnType = { requestId: string; error?: string };
type GetAggregatorRequestStatusReturnType = {
  requestId: string;
  status: AggregatorRequestStatus;
  error?: string;
};

export type { SubmitWithdrawReturnType, SubmitAggregationReturnType, GetAggregatorRequestStatusReturnType };

//#endregion

//#region v3 sync (indexer cursor streams — see plan-shardtree-curvy.md)

/** One committed leaf on the /v3/sync wire — a superset of the SDK's `SyncedLeaf`. */
type SyncCommittedNote = {
  /** Slot in the on-chain notes tree (dense, zero-stripped) — the cursor. */
  index: number;
  noteId: string;
  /** Delivery metadata, present when the note was announced with it. */
  ephemeralKey?: [string, string];
  viewTag?: number;
  amount?: string;
  token?: string;
  isPlaintext?: boolean;
  /** Batch-prover run id whose commit tx covered this note. Null until committed. */
  batchRunId?: string | null;
  /** Relay submission id that produced this note (aggregation outputs/fee). Null for shields. */
  relaySubmissionId?: string | null;
  /** Block of the announce tx — the user-action time (pairs with `requestTxHash`). */
  blockNumber?: number;
  /** The tx that announced the note (submitAggregation / autoShield) — user-action time. */
  requestTxHash?: string;
};

type SyncNullifierRecord = {
  index: number;
  nullifier: string;
  /** Relay submission id whose tx consumed this nullifier. */
  relaySubmissionId?: string | null;
  blockNumber?: number;
};

type GetSyncMetaReturnType = {
  lastIndexedBlock: number;
  noteCount: number;
  nullifierCount: number;
  pendingCount: number;
  shardCount?: number;
  shardHeight?: number;
  shardSize?: number;
  /** Direct chain head as the indexer sees it (decimal strings). */
  chain: { root: string; noteIndex: string; blockNumber: string };
};

type GetSyncNotesReturnType = { fromIndex: number; notes: SyncCommittedNote[]; nextIndex: number; total: number };
type GetSyncNullifiersReturnType = {
  fromIndex: number;
  nullifiers: SyncNullifierRecord[];
  nextIndex: number;
  total: number;
};
type GetSyncShardRootsReturnType = {
  fromIndex: number;
  shardRoots: string[];
  nextIndex: number;
  total: number;
  shardHeight: number;
  shardSize: number;
};

export type {
  SyncCommittedNote,
  SyncNullifierRecord,
  GetSyncMetaReturnType,
  GetSyncNotesReturnType,
  GetSyncNullifiersReturnType,
  GetSyncShardRootsReturnType,
};

//#endregion

//#region Portals

type PortalPublicKeysInput = {
  spendingKey: string;
  viewingKey: string;
  babyJubjubPublicKey: string;
};

type BasePortalRequest =
  | { curvyId: CurvyId; publicKeys?: never }
  | { publicKeys: PortalPublicKeysInput; curvyId?: never };

type InsertEntryPortalRequestBody = BasePortalRequest & {
  coinType?: string;
  currencyId?: number;
};

type InsertExitPortalRequestBody = BasePortalRequest & {
  currencyId: number;
  exitAddress: string;
  coinType?: string;
  exitNetworkId?: number;
  exitCurrencyId?: number;
};

type InsertPortalReturnType = {
  data: { address: HexString; flavour: NETWORK_FLAVOUR_VALUES };
};

type PortalRecord = {
  id: string;
  ephemeralKey: string;
  viewTag: string;
  createdAt: string;
  updatedAt: string;
} & ({ type: "entry"; ownerHash: string } | { type: "exit"; exitAddress: HexString; exitChainId: string });

type MatchedEvmPortal = PortalRecord & {
  flavour: "evm";
  contractAddress: HexString;
  recoveryAddress: HexString;
};

type MatchedSolanaPortal = PortalRecord & {
  flavour: "solana";
  // Solana vault PDA (base58). Widened from HexString because Solana addresses are not hex.
  contractAddress: string;
  // Base58 recovery identifier pubkey — the on-chain PDA seed used with ownerHash.
  recoveryPubKey: string;
};

type MatchedPortalRecord = MatchedEvmPortal | MatchedSolanaPortal;

type GetPortalRecordsReturnType = {
  portals: PortalRecord[];
  /** Opaque keyset cursor for the next page; null when the feed is exhausted. */
  nextCursor: string | null;
};

// Mirrors backend PortalState (packages/backend/src/lib/repositories/portal/database/type.ts).
// Kept in sync manually — the SDK can't import backend types. The `compliance_failed`
// value is the recovery-relevant signal for compliance outcomes; the route deliberately
// does not expose richer compliance details.
type PortalState =
  | "awaiting_funds"
  | "compliance_checking"
  | "compliance_failed"
  | "bridging"
  | "shielding"
  | "exiting"
  | "completed"
  | "failed";

type PortalStatusResponse = {
  type: "entry" | "exit";
  state: PortalState;
  createdAt: string;
  updatedAt: string;
};

type GetPortalStatusReturnType = { data: PortalStatusResponse };

// ── Bridge estimate (POST /bridge/estimate) ──
// A pre-flight quote for a bridge/swap that mirrors what the broadcaster will execute: it bridges
// `bridgedAmount` (= fromAmount − carve) and the recipient receives at least `toAmountMin`. `carve`
// is the operator's reimbursement (source deploy gas + the LiFi native fee) withheld from the amount.
type BridgeEstimateRequestBody = {
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  /** Gross input amount, decimal string (base units of `fromToken`). */
  fromAmount: string;
  /** The sender address used for the quote (typically the deterministic portal address). */
  fromAddress: string;
  /** Destination receiver; defaults to `fromAddress` when omitted. */
  toAddress?: string;
};

/** Wire shape (all amounts decimal strings). */
type BridgeEstimateReturnType = {
  data: {
    tool: string;
    fromAmount: string;
    bridgedAmount: string;
    carve: string;
    nativeFeeWei: string;
    toAmountMin: string;
  };
};

/** Parsed estimate (amounts as bigint) returned by the `estimateBridge` action. */
type BridgeEstimate = {
  /** Selected bridge tool (e.g. "across", "stargate"). */
  tool: string;
  /** Gross input amount (base units of `fromToken`). */
  fromAmount: bigint;
  /** Amount actually bridged (`fromAmount − carve`). */
  bridgedAmount: bigint;
  /** Operator reimbursement withheld from the amount (source gas + LiFi native fee), in `fromToken` units. */
  carve: bigint;
  /** Native fee (wei) the operator fronts for the route. */
  nativeFeeWei: bigint;
  /** Minimum received at the destination (base units of `toToken`). */
  toAmountMin: bigint;
};

//#endregion

export type {
  Network,
  Currency,
  FeeCollector,
  ProtocolConfig,
  CurrencyPrice,
  NetworksWithCurrenciesResponse,
  PricesResponse,
  ProtocolResponse,
  GetNetworksReturnType,
  RegisterCurvyIdRequestBody,
  RegisterCurvyIdReturnType,
  ResolveCurvyIdReturnType,
  GetCurvyIdByOwnerAddressResponse,
  GetCurvyIdByOwnerAddressReturnType,
  InsertEntryPortalRequestBody,
  InsertExitPortalRequestBody,
  InsertPortalReturnType,
  PortalPublicKeysInput,
  BasePortalRequest,
  PortalRecord,
  MatchedPortalRecord,
  GetPortalRecordsReturnType,
  PortalState,
  PortalStatusResponse,
  GetPortalStatusReturnType,
  BridgeEstimateRequestBody,
  BridgeEstimateReturnType,
  BridgeEstimate,
};

//#endregion

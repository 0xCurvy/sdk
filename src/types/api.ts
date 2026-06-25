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
  aggregationCircuitConfig?: CircuitConfig;
  withdrawCircuitConfig?: CircuitConfig;
  noteOwnershipCircuitConfig?: CircuitConfig;
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
  id: number;
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
  total: number;
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

//#endregion

export type {
  Network,
  Currency,
  NetworksWithCurrenciesResponse,
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
};

//#endregion

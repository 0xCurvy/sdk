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
import type { PublicNote } from "@/types/note";

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

type SetBabyJubjubPublicKeyRequestBody = {
  babyJubjubPublicKey: string;
};

type SetBabyJubjubPublicKeyReturnType =
  | {
      data: {
        message: string;
      };
      error: null;
    }
  | {
      error?: string;
    };

//#endregion

//#region Aggregator

type GetAllNotesReturnType = {
  notes: PublicNote[];
};
type SubmitDepositReturnType = { requestId: string; error?: string };
type SubmitWithdrawReturnType = { requestId: string; error?: string };
type SubmitAggregationReturnType = { requestId: string; error?: string };
type SubmitNoteOwnershipProofReturnType = {
  notes: {
    ownerHash: string;
    deliveryTag: { viewTag: HexString; ephemeralKey: string };
    balance: { token: string; amount: string };
  }[];
  error?: string;
};
type GetAggregatorRequestStatusReturnType = {
  requestId: string;
  status: AggregatorRequestStatus;
  error?: string;
};

export type {
  GetAllNotesReturnType,
  SubmitDepositReturnType,
  SubmitWithdrawReturnType,
  SubmitAggregationReturnType,
  GetAggregatorRequestStatusReturnType,
};

//#endregion

//#region Portals

type InsertEntryPortalRequestBody = {
  curvyId: CurvyId;
  coinType?: string;
  currencyId?: number;
};

type InsertExitPortalRequestBody = {
  curvyId: CurvyId;
  currencyId: number;
  exitAddress: string;
  coinType?: string;
  exitNetworkId?: number;
  exitCurrencyId?: number;
};

type InsertPortalReturnType = {
  data: { address: HexString };
};

type PortalRecord = {
  id: number;
  ephemeralKey: string;
  viewTag: string;
  createdAt: string;
  updatedAt: string;
} & ({ type: "entry"; ownerHash: string } | { type: "exit"; exitAddress: HexString; exitChainId: string });

type MatchedPortalRecord = PortalRecord & {
  contractAddress: HexString;
  recoveryAddress: HexString;
};

type GetPortalRecordsReturnType = {
  portals: PortalRecord[];
  total: number;
};

type RecoveryStage =
  | { step: "deriving_key" }
  | { step: "waiting_for_gas"; recoveryAddress: HexString }
  | { step: "deploying_recovery_portal" }
  | { step: "submitting_transaction" }
  | { step: "complete"; txHash: HexString }
  | { step: "failed"; error: string };

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
  SetBabyJubjubPublicKeyRequestBody,
  SetBabyJubjubPublicKeyReturnType,
  SubmitNoteOwnershipProofReturnType,
  InsertEntryPortalRequestBody,
  InsertExitPortalRequestBody,
  InsertPortalReturnType,
  PortalRecord,
  MatchedPortalRecord,
  GetPortalRecordsReturnType,
  RecoveryStage,
};

//#endregion

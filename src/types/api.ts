//#region API Types

//////////////////////////////////////////////////////////////////////////////
//
// API Types
//
//////////////////////////////////////////////////////////////////////////////

import type { NETWORK_FLAVOUR_VALUES, NETWORK_GROUP_VALUES } from "@/constants/networks";
import type { AggregatorRequestStatus } from "@/types/aggregator";
import type { CircuitConfig } from "@/types/core";
import type { CurvyId } from "@/types/curvy";
import type { HexString } from "@/types/helper";
import type { PublicNote } from "@/types/note";

type _Announcement = {
  createdAt: string;
  id: string;
  networkFlavour: NETWORK_FLAVOUR_VALUES;
  viewTag: string;
};

type RawAnnouncement = _Announcement & {
  ephemeralPublicKey: string;
};

type ExtendedAnnouncement = RawAnnouncement & {
  publicKey: string;
};

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
};

type Network = {
  id: number;
  name: string;
  group: NETWORK_GROUP_VALUES;
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

//#region Announcement
type CreateAnnouncementRequestBody = {
  ephemeralPublicKey: string;
  network_id: number;
  recipientStealthAddress: string;
  recipientStealthPublicKey: string;
  viewTag: string;
};
type CreateAnnouncementReturnType = {
  data?: {
    id: string;
    message: string;
  };
  error?: string | null;
};

type GetAnnouncementsResponse = {
  data: { announcements: Array<RawAnnouncement>; total: number };
  error: string | null;
};
type GetAnnouncementsReturnType = {
  announcements: Array<RawAnnouncement>;
  total: number;
};

type UpdateAnnouncementEncryptedMessageRequestBody = {
  encryptedMessage: string;
  encryptedMessageSenderPublicKey: string;
};
type UpdateAnnouncementEncryptedMessageReturnType = {
  data?: {
    encryptedMessage: string;
    encryptedMessageSenderPublicKey: string;
  };
  error?: string | null;
};

type GetAnnouncementEncryptedMessageReturnType = {
  data?: {
    encryptedMessage: string | null;
    encryptedMessageSenderPublicKey: string | null;
  };
  error?: string | null;
};

//#endregion

//#region Network

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

//#endregion

export type {
  CreateAnnouncementRequestBody,
  CreateAnnouncementReturnType,
  GetAnnouncementsResponse,
  GetAnnouncementsReturnType,
  RawAnnouncement,
  ExtendedAnnouncement,
  UpdateAnnouncementEncryptedMessageRequestBody,
  UpdateAnnouncementEncryptedMessageReturnType,
  GetAnnouncementEncryptedMessageReturnType,
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
};

//#endregion

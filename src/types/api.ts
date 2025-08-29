//#region API Types

//////////////////////////////////////////////////////////////////////////////
//
// API Types
//
//////////////////////////////////////////////////////////////////////////////

import type {
  NETWORK_FLAVOUR_VALUES,
  NETWORK_GROUP_VALUES,
} from "@/constants/networks";
import type {
  CSAInfo,
  CsucAction,
  CsucActionPayload,
  CsucActionStatus,
  CsucEstimatedActionCost,
} from "@/types/csuc";
import type { GasSponsorshipRequest } from "@/types/gas-sponsorship";
import type { NetworkFilter } from "@/utils/network";
import type { AggregatorRequestStatus } from "./aggregator";

type _Announcement = {
  createdAt: string;
  id: string;
  networkFlavour: NETWORK_FLAVOUR_VALUES;
  viewTag: string;
};

type RawAnnouncement = _Announcement & {
  ephemeralPublicKey: string;
};

type Currency = {
  id: number;
  name: string;
  symbol: string;
  coinmarketcapId: string;
  iconUrl: string;
  price: string;
  updatedAt: string;
  decimals: number;
  contractAddress: string;
  nativeCurrency: boolean;
  csucEnabled: boolean;
};

type Network = {
  id: number;
  name: string;
  group: NETWORK_GROUP_VALUES;
  testnet: boolean;
  slip0044: number;
  flavour: NETWORK_FLAVOUR_VALUES;
  multiCallContractAddress: string;
  csucContractAddress?: string;
  aggregatorContractAddress?: string;
  nativeCurrency: string | null;
  chainId: string;
  blockExplorerUrl: string;
  rpcUrl: string;
  currencies: Array<Currency>;
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

type RegisterCurvyHandleRequestBody = {
  handle: string;
  ownerAddress: string;
  publicKeys: Array<{
    spendingKey: string;
    viewingKey: string;
  }>;
};
type RegisterCurvyHandleReturnType =
  | {
      message?: string;
    }
  | {
      error?: string;
    };
type ResolveCurvyHandleReturnType = {
  data: {
    createdAt: string;
    publicKeys: Array<{
      spendingKey: string;
      viewingKey: string;
    }>;
  } | null;
  error?: string | null;
};
type GetCurvyHandleByOwnerAddressResponse = {
  data: {
    handle: string;
  } | null;
  error?: string | null;
};
type GetCurvyHandleByOwnerAddressReturnType = string | null;

//#endregion

//#region Aggregator

type GetAllNotesReturnType = {
  notes: { ownerHash: string; viewTag: string; ephemeralKey: string }[];
};
type SubmitDepositReturnType = { requestId: string };
type SubmitWithdrawReturnType = { requestId: string };
type SubmitAggregationReturnType = { requestId: string };
type SubmitNoteOwnershipProofReturnType = {
  notes: {
    ownerHash: string;
    viewTag: string;
    ephemeralKey: string;
    token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    amount: string;
  }[];
};
type AggregatorRequestStatusValuesType = keyof typeof AggregatorRequestStatus;
type GetAggregatorRequestStatusReturnType = {
  requestId: string;
  status: AggregatorRequestStatusValuesType;
};

export type {
  GetAllNotesReturnType,
  SubmitDepositReturnType,
  SubmitWithdrawReturnType,
  SubmitAggregationReturnType,
  GetAggregatorRequestStatusReturnType,
};

//#endregion

//#region CSUC

type GetCSAInfoRequest = {
  network: NetworkFilter;
  csas: string[];
};

type GetCSAInfoResponse = {
  data: {
    csaInfo: CSAInfo[];
  };
};

type GetActionEstimatedCostRequest = {
  payloads: CsucActionPayload[];
};

type GetActionEstimatedCostResponse = {
  data: CsucEstimatedActionCost[];
};

type CreateActionRequest = {
  action: CsucAction;
};

type CreateActionResponse = {
  data: CsucActionStatus;
};

type GetActionStatusResponse = {
  data: CsucActionStatus[];
};

export type {
  GetCSAInfoRequest,
  GetCSAInfoResponse,
  GetActionEstimatedCostRequest,
  GetActionEstimatedCostResponse,
  CreateActionRequest,
  CreateActionResponse,
  GetActionStatusResponse,
};

//#endregion

//#region GasSponsorship

type SubmitGasSponsorshipRequest = GasSponsorshipRequest;

type SubmitGasSponsorshipRequestReturnType = {
  data: { actionIds: string[] };
};

export type {
  SubmitGasSponsorshipRequest,
  SubmitGasSponsorshipRequestReturnType,
};

//#endregion

export type {
  CreateAnnouncementRequestBody,
  CreateAnnouncementReturnType,
  GetAnnouncementsResponse,
  GetAnnouncementsReturnType,
  RawAnnouncement,
  UpdateAnnouncementEncryptedMessageRequestBody,
  UpdateAnnouncementEncryptedMessageReturnType,
  GetAnnouncementEncryptedMessageReturnType,
  Network,
  Currency,
  NetworksWithCurrenciesResponse,
  GetNetworksReturnType,
  RegisterCurvyHandleRequestBody,
  RegisterCurvyHandleReturnType,
  ResolveCurvyHandleReturnType,
  GetCurvyHandleByOwnerAddressResponse,
  GetCurvyHandleByOwnerAddressReturnType,
  SubmitNoteOwnershipProofReturnType,
};

//#endregion

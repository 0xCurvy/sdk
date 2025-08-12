//#region API Types

//////////////////////////////////////////////////////////////////////////////
//
// API Types
//
//////////////////////////////////////////////////////////////////////////////

import type { NETWORK_FLAVOUR_VALUES, NETWORK_GROUP_VALUES } from "@/constants/networks";
import type { InputNoteData, OutputNoteData, Signature } from "@/types/aggregator";
import type {
  CSAInfo,
  CsucAction,
  CsucActionPayload,
  CsucActionStatus,
  CsucEstimatedActionCost,
  CsucSupportedNetwork,
  CsucSupportedNetworkId,
} from "@/types/csuc";
import type { GasSponsorshipRequest } from "@/types/gas-sponsorship";

type _Announcement = {
  createdAt: string;
  id: string;
  networkFlavour: NETWORK_FLAVOUR_VALUES;
  network_id: number;
  viewTag: string;
};

type RawAnnouncement = _Announcement & {
  ephemeralPublicKey: string;
};

type Currency = {
  id: number;
  name: string;
  symbol: string;
  coinmarketcap_id: string;
  native?: boolean;
  icon_url: string;
  price: string;
  updated_at: string;
  decimals: number;
  contract_address?: string;
  csuc_enabled: boolean;
};

type RawNetwork = {
  id: number;
  name: string;
  group: NETWORK_GROUP_VALUES;
  testnet: boolean;
  slip0044: number;
  flavour: NETWORK_FLAVOUR_VALUES;
  multiCallContractAddress: string;
  csucContractAddress?: string;
  nativeCurrency: string | null;
  chainId: string;
  blockExplorerUrl: string;
};

type RawNetworkWithCurrencies = RawNetwork & {
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

type Network = RawNetworkWithCurrencies & {
  rpcUrl: string;
};

type NetworkWithCurrencies = Network & {
  currencies: Array<Currency>;
};

type NetworksWithCurrenciesResponse = { data: Array<RawNetworkWithCurrencies>; error: string | null };
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

type DepositPayload = {
  outputNotes: OutputNoteData[];
  csucAddress: string;
  csucTransferAllowanceSignature: string;
};

type WithdrawPayload = {
  inputNotes: InputNoteData[];
  signatures: Signature[];
  destinationAddress: string;
};

type AggregationRequest = {
  id?: string;
  isDummy: boolean;
  userId: string;
  ephemeralKeys: bigint[];
  inputNotesData: InputNoteData[];
  outputNotesData: OutputNoteData[];
  outputSignatures: Signature[];
  aggregationGroupId: string;
};

type AggregatorRequestStatus = "pending" | "submitting" | "success" | "failed" | "cancelled";

type SubmitDepositReturnType = { requestId: string };
type SubmitWithdrawReturnType = { requestId: string };
type SubmitAggregationReturnType = { requestId: string };
type GetAggregatorRequestStatusReturnType = { requestId: string; status: AggregatorRequestStatus };

export type {
  DepositPayload,
  WithdrawPayload,
  AggregationRequest,
  AggregatorRequestStatus,
  SubmitDepositReturnType,
  SubmitWithdrawReturnType,
  SubmitAggregationReturnType,
  GetAggregatorRequestStatusReturnType,
};

//#endregion

//#region CSUC

type GetCSAInfoRequest = {
  network: CsucSupportedNetwork | CsucSupportedNetworkId;
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
  data: { estimatedCosts: CsucEstimatedActionCost[] };
};

type CreateActionRequest = {
  actions: CsucAction[];
};

type CreateActionResponse = {
  data: { actionStatuses: CsucActionStatus[] };
};

export type {
  GetCSAInfoRequest,
  GetCSAInfoResponse,
  GetActionEstimatedCostRequest,
  GetActionEstimatedCostResponse,
  CreateActionRequest,
  CreateActionResponse,
};

//#endregion

//#region GasSponsorship

type SubmitGasSponsorshipRequest = GasSponsorshipRequest;

type SubmitGasSponsorshipRequestReturnType = {
  data: { actionIds: string[] };
};

export type { SubmitGasSponsorshipRequest, SubmitGasSponsorshipRequestReturnType };

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
  NetworkWithCurrencies,
  Currency,
  NetworksWithCurrenciesResponse,
  GetNetworksReturnType,
  RegisterCurvyHandleRequestBody,
  RegisterCurvyHandleReturnType,
  ResolveCurvyHandleReturnType,
  GetCurvyHandleByOwnerAddressResponse,
  GetCurvyHandleByOwnerAddressReturnType,
};

//#endregion

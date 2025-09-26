//#region API Types

//////////////////////////////////////////////////////////////////////////////
//
// API Types
//
//////////////////////////////////////////////////////////////////////////////

import type { NETWORK_FLAVOUR_VALUES, NETWORK_GROUP_VALUES } from "@/constants/networks";
import type { HexString } from "@/types/helper";
import type { MetaTransactionType } from "@/types/meta-transaction";
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

type _Currency = {
  id: number;
  name: string;
  symbol: string;
  coinmarketcapId: string;
  iconUrl: string;
  price: string | null;
  updatedAt: string;
  decimals: number;
  contractAddress: string;
  nativeCurrency: boolean;
};

type Currency = _Currency &
  (
    | {
        erc1155Enabled: false;
      }
    | {
        erc1155Enabled: true;
        erc1155Id: bigint;
      }
  );

type Network = {
  id: number;
  name: string;
  group: NETWORK_GROUP_VALUES;
  testnet: boolean;
  slip0044: number;
  flavour: NETWORK_FLAVOUR_VALUES;
  multiCallContractAddress: string;
  erc1155ContractAddress?: string;
  minWrappingAmountInNative?: string;
  aggregatorContractAddress?: string;
  nativeCurrency: string | null; // TODO: Why is this string?
  chainId: string;
  blockExplorerUrl: string;
  rpcUrl: string;
  currencies: Array<Currency>;
  feeCollectorAddress?: string;
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
  publicKeys: {
    spendingKey: string;
    viewingKey: string;
    babyJubjubPublicKey: string;
  };
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
    publicKeys: {
      spendingKey: string;
      viewingKey: string;
      babyJubjubPublicKey: string | null;
    };
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
type SubmitDepositReturnType = { requestId: string };
type SubmitWithdrawReturnType = { requestId: string };
type SubmitAggregationReturnType = { requestId: string };
type SubmitNoteOwnershipProofReturnType = {
  notes: {
    ownerHash: string;
    deliveryTag: { viewTag: string; ephemeralKey: string };
    balance: { token: HexString; amount: string };
  }[];
};
type AggregatorRequestStatusValuesType = "pending" | "processing" | "completed" | "failed" | "success";
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

//#region MetaTransaction

type MetaTransactionEstimationRequestBody = {
  type: MetaTransactionType;
  fromAddress: string;
  toAddress?: string;
  amount: string;
  network: string;
  currencyAddress: string;
  ownerHash?: string;
};

type MetaTransactionSubmitBody = {
  id: string;
  signature: any;
};

type GetMetaTransactionStatusReturnType = "estimated" | "pending" | "completed" | "failed" | "rejected";

export type { MetaTransactionEstimationRequestBody, GetMetaTransactionStatusReturnType, MetaTransactionSubmitBody };
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
  AggregatorRequestStatusValuesType,
  GetNetworksReturnType,
  RegisterCurvyHandleRequestBody,
  RegisterCurvyHandleReturnType,
  ResolveCurvyHandleReturnType,
  GetCurvyHandleByOwnerAddressResponse,
  GetCurvyHandleByOwnerAddressReturnType,
  SetBabyJubjubPublicKeyRequestBody,
  SetBabyJubjubPublicKeyReturnType,
  SubmitNoteOwnershipProofReturnType,
};

//#endregion

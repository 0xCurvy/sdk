import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { Currency, Network } from "@/types/api";
import type { ExtractValues, HexString } from "@/types/helper";

const META_TRANSACTION_TYPES = {
  ERC1155_TRANSFER: "erc1155_transfer",
  ERC1155_ONBOARD: "erc1155_onboard",
} as const;

export type MetaTransactionType = ExtractValues<typeof META_TRANSACTION_TYPES>;

const META_TRANSACTION_STATUSES = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REJECTED: "rejected",
} as const;

export type MetaTransactionStatus = ExtractValues<typeof META_TRANSACTION_STATUSES>;

export type MetaTransaction = {
  id?: string;
  network: Network;
  currency: Currency;
  fromAddress: HexString;
  type: MetaTransactionType;
  payload: string;
  createdAt?: Date;
  updatedAt?: Date;
  gasFee: bigint;
  curvyFee: bigint;
  status: MetaTransactionStatus;
};

export type MetaTransactionEstimate = CurvyCommandEstimate;

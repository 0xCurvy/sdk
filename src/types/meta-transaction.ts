import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { Currency, Network } from "@/types/api";
import type { ExtractValues, HexString } from "@/types/helper";

const META_TRANSACTION_TYPES = {
  VAULT_TRANSFER: "vault_transfer",
  VAULT_ONBOARD: "vault_onboard",
  VAULT_WITHDRAW: "vault_withdraw",
  VAULT_DEPOSIT_TO_AGGREGATOR: "vault_deposit_to_aggregator",
} as const;
type META_TRANSACTION_TYPES = typeof META_TRANSACTION_TYPES;
export { META_TRANSACTION_TYPES };
export type MetaTransactionType = ExtractValues<META_TRANSACTION_TYPES>;

const META_TRANSACTION_STATUSES = {
  ESTIMATED: "estimated",
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
type META_TRANSACTION_STATUSES = typeof META_TRANSACTION_STATUSES;
export { META_TRANSACTION_STATUSES };
export type MetaTransactionStatus = ExtractValues<typeof META_TRANSACTION_STATUSES>;

export type MetaTransaction = {
  id?: string;
  network: Network;
  currency: Currency;
  ownerHash?: string;
  fromAddress: HexString;
  toAddress?: HexString;
  type: MetaTransactionType;
  signature?: string;
  gasFeeInCurrency?: bigint;
  curvyFeeInCurrency?: bigint;
  status?: MetaTransactionStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

// TODO: Think about this
export type MetaTransactionEstimate = CurvyCommandEstimate;

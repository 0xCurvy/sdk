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

const META_TRANSACTION_NUMERIC_TYPES = {
  [META_TRANSACTION_TYPES.VAULT_ONBOARD]: 2,
  [META_TRANSACTION_TYPES.VAULT_TRANSFER]: 1,
  [META_TRANSACTION_TYPES.VAULT_DEPOSIT_TO_AGGREGATOR]: 1,
  [META_TRANSACTION_TYPES.VAULT_WITHDRAW]: 0,
} as const;
type META_TRANSACTION_NUMERIC_TYPES = typeof META_TRANSACTION_NUMERIC_TYPES;
export { META_TRANSACTION_NUMERIC_TYPES };

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
  network: Network;
  currency: Currency;
  amount: bigint;
  fromAddress: HexString;
  toAddress: HexString;
  ownerHash?: string;
  type: MetaTransactionType;
};

export type EstimatedMetaTransaction = { id: string; gasFeeInCurrency: bigint };
export type SignedMetaTransaction = EstimatedMetaTransaction & { signature: HexString };

export type MetaTransactionEstimate = CurvyCommandEstimate;

// This is from smart contracts
export const META_TRANSACTION_TYPES_TO_UINT8 = {
  [META_TRANSACTION_TYPES.VAULT_ONBOARD]: 2,
  [META_TRANSACTION_TYPES.VAULT_TRANSFER]: 1,
  [META_TRANSACTION_TYPES.VAULT_DEPOSIT_TO_AGGREGATOR]: 1,
  [META_TRANSACTION_TYPES.VAULT_WITHDRAW]: 0,
};

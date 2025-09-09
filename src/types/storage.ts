import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { ExtractValues } from "@/types/helper";

const BALANCE_TYPE = {
  SA: "sa",
  CSUC: "csuc",
  NOTE: "note",
} as const;
type BALANCE_TYPE = typeof BALANCE_TYPE;
type BALANCE_TYPE_VALUES = ExtractValues<BALANCE_TYPE>;

type PriceData = {
  price: string;
  decimals: number;
};

type CurrencyMetadata = {
  address: string;
  symbol: string;
  name: string;
  native?: boolean;
  decimals: number;
  iconUrl: string;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
};

type BalanceEntryBase = {
  walletId: string;
  source: string;

  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;

  currencyAddress: string;
  symbol: string;
  balance: bigint;

  lastUpdated: number;
};

type SaBalanceEntry = BalanceEntryBase & {
  type: BALANCE_TYPE["SA"];
  createdAt: string;
};
const isSaBalanceEntry = (entry: BalanceEntry): entry is SaBalanceEntry => {
  return entry.type === BALANCE_TYPE.SA;
};

type CsucBalanceEntry = BalanceEntryBase & {
  type: BALANCE_TYPE["CSUC"];
  nonce: bigint;
};
const isCsucBalanceEntry = (entry: BalanceEntry): entry is CsucBalanceEntry => {
  return entry.type === BALANCE_TYPE.CSUC;
};

type NoteBalanceEntry = BalanceEntryBase & {
  type: BALANCE_TYPE["NOTE"];
  owner: {
    babyJubjubPublicKey: {
      x: bigint;
      y: bigint;
    };
    sharedSecret: bigint;
  };
  deliveryTag: { ephemeralKey: bigint; viewTag: bigint };
};
const isNoteBalanceEntry = (entry: BalanceEntry): entry is NoteBalanceEntry => {
  return entry.type === BALANCE_TYPE.NOTE;
};

type BalanceEntry = SaBalanceEntry | CsucBalanceEntry | NoteBalanceEntry;

type TotalBalance = {
  walletId: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  symbol: string;
  networkSlug: string;
  currencyAddress: string;
  totalBalance: string;
  lastUpdated: number;
};

type CurrencyHoldersOptions = {
  sortByTypeRanking: Record<BALANCE_TYPE_VALUES, number>;
  sortByBalance?: "asc" | "desc";
};

export type {
  CurrencyMetadata,
  PriceData,
  BalanceEntry,
  TotalBalance,
  CsucBalanceEntry,
  SaBalanceEntry,
  NoteBalanceEntry,
  BALANCE_TYPE_VALUES,
  CurrencyHoldersOptions,
};
export { isSaBalanceEntry, isCsucBalanceEntry, isNoteBalanceEntry, BALANCE_TYPE };

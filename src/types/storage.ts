import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { ExtractValues, HexString } from "@/types/helper";

const BALANCE_TYPE = {
  SA: "sa",
  ERC1155: "erc1155",
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

  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;

  currencyAddress: string;
  symbol: string;
  decimals: number;
  balance: bigint;

  lastUpdated: number;
};

type SaBalanceEntry = BalanceEntryBase & {
  source: HexString;
  type: BALANCE_TYPE["SA"];
  createdAt: string;
};
const isSaBalanceEntry = (entry: BalanceEntry): entry is SaBalanceEntry => {
  return entry.type === BALANCE_TYPE.SA;
};

type Erc1155BalanceEntry = BalanceEntryBase & {
  source: HexString;
  type: BALANCE_TYPE["ERC1155"];
};
const isErc1155BalanceEntry = (entry: BalanceEntry): entry is Erc1155BalanceEntry => {
  return entry.type === BALANCE_TYPE.ERC1155;
};

type NoteBalanceEntry = BalanceEntryBase & {
  source: string;

  type: BALANCE_TYPE["NOTE"];
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    };
    sharedSecret: string;
  };
  deliveryTag: { ephemeralKey: string; viewTag: string };
};
const isNoteBalanceEntry = (entry: BalanceEntry): entry is NoteBalanceEntry => {
  return entry.type === BALANCE_TYPE.NOTE;
};

type BalanceEntry = SaBalanceEntry | Erc1155BalanceEntry | NoteBalanceEntry;

type TotalBalance = {
  walletId: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  symbol: string;
  networkSlug: string;
  currencyAddress: string;
  totalBalance: string;
  lastUpdated: number;
};

type BalanceSourcesOptions = {
  sortByTypeRanking: Record<BALANCE_TYPE_VALUES, number>;
  sortByBalance?: "asc" | "desc";
};

export type {
  CurrencyMetadata,
  PriceData,
  BalanceEntry,
  TotalBalance,
  Erc1155BalanceEntry,
  SaBalanceEntry,
  NoteBalanceEntry,
  BALANCE_TYPE_VALUES,
  BalanceSourcesOptions,
};
export { isSaBalanceEntry, isErc1155BalanceEntry, isNoteBalanceEntry, BALANCE_TYPE };

import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { ExtractValues, HexString } from "@/types/helper";

const BALANCE_TYPE = {
  SA: "sa",
  VAULT: "vault",
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
  vaultTokenId?: string;
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

type VaultBalanceEntry = BalanceEntryBase & {
  source: HexString;
  vaultTokenId: bigint;
  type: BALANCE_TYPE["VAULT"];
};
const isVaultBalanceEntry = (entry: BalanceEntry): entry is VaultBalanceEntry => {
  return entry.type === BALANCE_TYPE.VAULT;
};

type NoteBalanceEntry = BalanceEntryBase & {
  source: string;
  id: string;

  type: BALANCE_TYPE["NOTE"];
  vaultTokenId: bigint;
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

type BalanceEntry = SaBalanceEntry | VaultBalanceEntry | NoteBalanceEntry;

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
  fiatBalanceThreshold?: Partial<Record<BALANCE_TYPE_VALUES, number>>;
};

export type {
  CurrencyMetadata,
  PriceData,
  BalanceEntry,
  TotalBalance,
  VaultBalanceEntry,
  SaBalanceEntry,
  NoteBalanceEntry,
  BALANCE_TYPE_VALUES,
  BalanceSourcesOptions,
};
export { isSaBalanceEntry, isVaultBalanceEntry, isNoteBalanceEntry, BALANCE_TYPE };

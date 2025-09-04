import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";

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
  type: "sa";
  createdAt: string;
};
const isSaBalanceEntry = (entry: BalanceEntry): entry is SaBalanceEntry => {
  return entry.type === "sa";
};

type CsucBalanceEntry = BalanceEntryBase & {
  type: "csuc";
  nonce: bigint;
};
const isCsucBalanceEntry = (entry: BalanceEntry): entry is CsucBalanceEntry => {
  return entry.type === "csuc";
};

type NoteBalanceEntry = BalanceEntryBase & {
  type: "note";
  owner: {
    babyJubPublicKey: [string, string];
    sharedSecret: string;
  };
  ephemeralKey: string;
  viewTag: string;
};
const isNoteBalanceEntry = (entry: BalanceEntry): entry is NoteBalanceEntry => {
  return entry.type === "note";
};

type BalanceEntry = SaBalanceEntry | CsucBalanceEntry | NoteBalanceEntry;

type CachedNote = {
  ownerHash: string;
  viewTag: string;
  ephemeralKey: string;
  token: string | undefined;
  amount: string | undefined;
  walletId: string;
};

type TotalBalance = {
  walletId: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  symbol: string;
  networkSlug: string;
  currencyAddress: string;
  totalBalance: string;
  lastUpdated: number;
};

export type {
  CurrencyMetadata,
  BalanceEntry,
  TotalBalance,
  CachedNote,
  CsucBalanceEntry,
  SaBalanceEntry,
  NoteBalanceEntry,
};
export { isSaBalanceEntry, isCsucBalanceEntry, isNoteBalanceEntry };

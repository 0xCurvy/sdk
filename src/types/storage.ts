import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { HexString } from "@/types/helper";

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

type GenericBalanceEntry = {
  walletId: string;

  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;

  currencyAddress: string;
  vaultTokenId: bigint | null;
  symbol: string;
  decimals: number;
  balance: bigint;

  lastUpdated: number;
};

type BalanceEntry = GenericBalanceEntry & {
  source: HexString;
  id: string;

  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
    };
    sharedSecret: string;
  };
  deliveryTag: { ephemeralKey: string; viewTag: string };
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

export type { CurrencyMetadata, PriceData, GenericBalanceEntry, BalanceEntry, TotalBalance };

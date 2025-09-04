import type { TOKENS } from "@/constants/networks";
import type { CurvyAddress, CurvyWalletData, PriceData, ScanInfo } from "@/types";
import type { BalanceEntry, CurrencyMetadata, TotalBalance } from "@/types/storage";
import type { CurvyWallet } from "@/wallet";

export interface StorageInterface {
  clearStorage(): Promise<void>;

  storeCurvyWallet(wallet: CurvyWallet): Promise<void>;
  updateCurvyWalletData(walletId: string, changes: Partial<CurvyWalletData>): Promise<void>;
  getCurvyWalletDataById(id: string): Promise<CurvyWalletData>;
  getLatestScanCursor(walletId: string): Promise<number | undefined>;
  getOldestScanCursor(walletId: string): Promise<number | undefined>;
  getScanInfo(walletId: string): Promise<ScanInfo>;

  storeCurvyAddress(address: CurvyAddress): Promise<void>;
  storeManyCurvyAddresses(addresses: CurvyAddress[]): Promise<void>;
  getCurvyAddressById(id: string): Promise<CurvyAddress>;
  getCurvyAddressesByWalletId(walletId: string): Promise<CurvyAddress[]>;
  getCurvyAddressBalanceNetworks(address: string): Promise<string[]>;

  upsertCurrencyMetadata(metadata: Map<string, CurrencyMetadata>): Promise<void>;
  getCurrencyMetadata(address: string, networkSlug: string): Promise<CurrencyMetadata>;

  upsertPriceData(data: Map<TOKENS, PriceData>): Promise<void>;
  getCurrencyPrice(token: TOKENS): Promise<PriceData>;
  getPriceFeed(): Promise<Map<TOKENS, PriceData>>;

  updateBalancesAndTotals(walletId: string, entries: BalanceEntry[]): Promise<void>;

  getTotalsByCurrencyAndNetwork(walletId: string): Promise<TotalBalance[]>;
  getCurrencyHolders(walletId: string, currencyAddress: string, networkSlug: string): Promise<BalanceEntry[]>;
  getBalancesGroupedBySource(walletId: string): Promise<Record<string, BalanceEntry[]>>;
}

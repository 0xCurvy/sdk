import type { TOKENS } from "@/constants/networks";
import type { CachedNote, CurvyAddress, CurvyWalletData, ScanInfo } from "@/types";
import type { BalanceEntry, CurrencyMetadata, TotalBalance } from "@/types/storage";
import type { CurvyWallet } from "@/wallet";

export interface StorageInterface {
  storeCurvyAddress(address: CurvyAddress): Promise<void>;
  storeManyCurvyAddresses(addresses: CurvyAddress[]): Promise<void>;

  storeCurvyNote(note: CachedNote): Promise<void>;
  storeManyCurvyNotes(notes: CachedNote[]): Promise<void>;

  upsertCurrencyMetadata(metadata: Map<string, CurrencyMetadata>): Promise<void>;
  getCurrencyMetadata(address: string, networkSlug: string): Promise<CurrencyMetadata>;

  getCurvyAddressById(id: string): Promise<CurvyAddress>;
  getCurvyAddressBalanceNetworks(address: string): Promise<string[]>;
  getCurvyAddressesByWalletId(walletId: string): Promise<CurvyAddress[]>;

  storeCurvyWallet(wallet: CurvyWallet): Promise<void>;
  updateCurvyWalletData(walletId: string, changes: Partial<CurvyWalletData>): Promise<void>;
  getCurvyWalletDataById(id: string): Promise<CurvyWalletData>;

  getLatestScanCursor(walletId: string): Promise<number | undefined>;
  getOldestScanCursor(walletId: string): Promise<number | undefined>;
  getScanInfo(walletId: string): Promise<ScanInfo>;

  updatePriceData(data: Map<TOKENS, { price: string; decimals: number }>): Promise<void>;
  getTokenPrice(token: TOKENS): Promise<{ price: string; decimals: number }>;
  getAllTokenPrices(): Promise<Map<TOKENS, { price: string; decimals: number }>>;

  clearStorage(): Promise<void>;

  updateBalancesAndTotals(walletId: string, entries: BalanceEntry[]): Promise<void>;

  getTotalsByCurrencyAndNetwork(walletId: string): Promise<TotalBalance[]>;
  getCurrencyHolders(walletId: string, currencyAddress: string, networkSlug: string): Promise<BalanceEntry[]>;
  groupBalancesByAddress(walletId: string): Promise<Record<string, BalanceEntry[]>>;
}

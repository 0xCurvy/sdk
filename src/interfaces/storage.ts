import type { TOKENS } from "@/constants/networks";
import type { BALANCE_TYPE_VALUES, CurvyAddress, CurvyWalletData, PriceData, ScanInfo } from "@/types";
import type { BalanceEntry, CurrencyMetadata, TotalBalance } from "@/types/storage";
import type { CurvyWallet } from "@/wallet";

export interface StorageInterface {
  clearStorage(): Promise<void>;

  storeCurvyWallet(wallet: CurvyWallet): Promise<void>;
  updateCurvyWalletData(walletId: string, changes: Partial<CurvyWalletData>): Promise<void>;
  getCurvyWalletDataById(id: string): Promise<CurvyWalletData>;
  /**
   * Gets the scan cursor of the most recent announcement that was scanned for the specified wallet.
   * @param walletId The ID of the wallet to sync.
   */
  getLatestScanCursor(walletId: string): Promise<number | undefined>;
  /**
   * Gets the scan cursor of the oldest announcement that was scanned for the specified wallet.
   * @param walletId The ID of the wallet to sync.
   */
  getOldestScanCursor(walletId: string): Promise<number | undefined>;
  /**
   * Gets the latest and oldest scan cursors and scan cutoff value for the specified wallet.
   * @param walletId The ID of the wallet to sync.
   */
  getScanInfo(walletId: string): Promise<ScanInfo>;

  storeCurvyAddress(address: CurvyAddress): Promise<void>;
  storeManyCurvyAddresses(addresses: CurvyAddress[]): Promise<void>;
  getCurvyAddressById(id: string): Promise<CurvyAddress>;
  getCurvyAddressesByWalletId(walletId: string): Promise<CurvyAddress[]>;
  /**
   * Gets the network slugs for which the specified address has balances.
   * @param address The address to get the network slugs for.
   */
  getNetworkSlugsOfAddressBalances(address: string): Promise<string[]>;

  upsertCurrencyMetadata(metadata: Map<string, CurrencyMetadata>): Promise<void>;
  /**
   * Gets the metadata for a specific currency on a specific network.
   * @param address The address of the currency.
   * @param networkSlug The slug of the network.
   */
  getCurrencyMetadata(address: string, networkSlug: string): Promise<CurrencyMetadata>;

  upsertPriceData(data: Map<TOKENS, PriceData>): Promise<void>;
  /**
   * Gets the price data for a specific token.
   * @param token
   */
  getCurrencyPrice(token: TOKENS): Promise<PriceData>;
  /**
   * Gets the price feed for all supported tokens.
   */
  getPriceFeed(): Promise<Map<TOKENS, PriceData>>;

  /**
   * Updates the balances and total balances for a given wallet based on the provided balance entries.
   * @param walletId The ID of the wallet to update balances for.
   * @param entries The balance entries to update.
   */
  updateBalancesAndTotals(walletId: string, entries: BalanceEntry[]): Promise<void>;

  /**
   * Gets the total balances grouped by currency and network for the specified wallet.
   * @param walletId The ID of the wallet to get total balances for.
   */
  getTotalsByCurrencyAndNetwork(walletId: string): Promise<TotalBalance[]>;

  /**
   * Gets all holders of a specific currency on a specific network within a wallet.
   * @param walletId
   * @param currencyAddress
   * @param networkSlug
   */
  getCurrencyHolders(walletId: string, currencyAddress: string, networkSlug: string): Promise<BalanceEntry[]>;

  /**
   * Gets all balance entries for a given wallet, grouped by their source.
   * @param walletId
   */
  getBalancesGroupedBySource(walletId: string): Promise<Record<string, BalanceEntry[]>>;

  /**
   * Gets a specific balance entry for a given address, currency, network, and type.
   * @param address
   * @param currencyAddress
   * @param networkSlug
   * @param type
   */
  getBalanceEntry(
    address: string,
    currencyAddress: string,
    networkSlug: string,
    type: BALANCE_TYPE_VALUES,
  ): Promise<BalanceEntry>;
}

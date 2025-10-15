import type { NETWORK_ENVIRONMENT_VALUES, TOKENS } from "@/constants/networks";
import type {
  BALANCE_TYPE_VALUES,
  BalanceSourcesOptions,
  CurvyAddress,
  CurvyWalletData,
  PriceData,
  ScanInfo,
} from "@/types";
import type { BalanceEntry, CurrencyMetadata, NoteBalanceEntry, TotalBalance } from "@/types/storage";
import type { CurvyWallet } from "@/wallet";

export interface StorageInterface {
  clearStorage(): Promise<void>;

  getNoteBalances(walletId: string, networkSlug?: string): Promise<NoteBalanceEntry[]>
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
  getCurvyAddress(address: string): Promise<CurvyAddress>;
  getCurvyAddressesByWalletId(walletId: string): Promise<CurvyAddress[]>;

  /**
   * Gets all addresses for a given wallet that have not been scanned within the specified staleness threshold (including new addresses).
   * @param walletId The ID of the wallet to get addresses for.
   * @param environment {NETWORK_ENVIRONMENT_VALUES} The network environment to get addresses for.
   * @param stalenessThresholdMs The staleness threshold in milliseconds. Addresses not scanned within this threshold are considered stale, default is 3 days
   */
  getScannableAddresses(
    walletId: string,
    environment: NETWORK_ENVIRONMENT_VALUES,
    stalenessThresholdMs?: number,
  ): Promise<CurvyAddress[]>;
  /**
   * Gets the network slugs for which the specified address has balances.
   * @param address The address to get the network slugs for.
   */
  getNetworkSlugsOfAddressBalances(address: string): Promise<string[]>;

  upsertCurrencyMetadata(metadata: Map<string, CurrencyMetadata>): Promise<void>;
  /**
   * Gets the metadata for a specific currency on a specific network.
   * @param addressOrId The address / erc1155TokenId of the currency.
   * @param networkSlug The slug of the network.
   */
  getCurrencyMetadata(addressOrId: string | bigint, networkSlug: string): Promise<CurrencyMetadata>;

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
   * Removes balance entries that have been spent from the storage.
   * @param entries
   */
  removeSpentBalanceEntries(entries: BalanceEntry[]): Promise<void>;

  /**
   * Gets the total balances grouped by currency and network for the specified wallet.
   * @param walletId The ID of the wallet to get total balances for.
   */
  getTotalsByCurrencyAndNetwork(walletId: string): Promise<TotalBalance[]>;

  /**
   * Gets the total balances for a specific network within a wallet.
   * @param walletId The ID of the wallet to get total balances for.
   * @param networkSlug The slug of the network to filter by.
   */
  getTotalsByNetwork(walletId: string, networkSlug: string): Promise<TotalBalance[]>;

  /**
   * Gets all sources of a specific currency on a specific network within a wallet.
   * @param walletId
   * @param currencyAddress
   * @param networkSlug
   * @param options - Optional parameters for sorting the results.
   * @param {BalanceSourcesOptions['sortByTypeRanking']} [options.sortTypeRanking] - A record defining the ranking of balance types for sorting purposes.
   * @param {BalanceSourcesOptions['sortByBalance']} [options.sortByBalance] - The order to sort by balance, either "asc" for ascending or "desc" for descending.
   */
  getBalanceSources(
    walletId: string,
    currencyAddress: string,
    networkSlug: string,
    options?: BalanceSourcesOptions,
  ): Promise<BalanceEntry[]>;

  /**
   * Gets all balance entries for a given wallet, grouped by their source.
   * @param walletId {string} - The ID of the wallet to get balances for.
   * @param environment {NETWORK_ENVIRONMENT_VALUES} - The network environment to filter balances by (optional).
   * @param networkSlug {string} - The network slug to filter balances by (optional).
   * @param type {BALANCE_TYPE_VALUES} - The type of balance to filter by (optional).
   */
  getBalancesGroupedBySource(
    walletId: string,
    environment?: NETWORK_ENVIRONMENT_VALUES,
    networkSlug?: string,
    type?: BALANCE_TYPE_VALUES,
  ): Promise<Record<string, BalanceEntry[]>>;

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

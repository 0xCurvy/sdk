import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { CurvyWalletData, HexString, PriceData } from "@/types";
import type { BalanceEntry, CurrencyMetadata, TotalBalance } from "@/types/storage";
import type { CurvyWallet } from "@/wallet";

export interface StorageInterface {
  clearStorage(): Promise<void>;

  insertCurvyWallet(wallet: CurvyWallet): Promise<void>;
  updateCurvyWalletData(walletId: string, changes: Partial<CurvyWalletData>): Promise<void>;
  getCurvyWalletDataById(id: string): Promise<CurvyWalletData>;

  upsertCurrencyMetadata(metadata: Map<string, CurrencyMetadata>): Promise<void>;
  /**
   * Gets the metadata for a specific currency on a specific network.
   * @param addressOrId The address / vaultTokenId of the currency.
   * @param networkSlug The slug of the network.
   */
  getCurrencyMetadata(addressOrId: string | bigint, networkSlug: string): Promise<CurrencyMetadata>;

  upsertPriceData(data: Map<string, PriceData>): Promise<void>;
  /**
   * Gets the price data for a specific token.
   * @param token
   */
  getCurrencyPrice(token: string): Promise<PriceData>;
  /**
   * Gets the price feed for all supported tokens.
   */
  getPriceFeed(): Promise<Map<string, PriceData>>;

  /**
   * Updates the balances and total balances for a given wallet based on the provided balance entries.
   * @param walletId The ID of the wallet to update balances for.
   * @param networkSlug Network slug of the balance entries.
   * @param entries The balance entries to update.
   */
  updateBalanceEntries(walletId: string, networkSlug: string, entries: BalanceEntry[]): Promise<void>;

  /**
   * Removes balance entries that have been spent from the storage.
   * @param entries - The balance entries to remove.
   */
  removeSpentBalanceEntries(entries: BalanceEntry[]): Promise<void>;

  /**
   * Gets all balances for the specified wallet
   * @param {string} [walletId = activeWalledId] The ID of the wallet to get balances for.
   * @param {NETWORK_ENVIRONMENT_VALUES} [environment] Optional filter for network environment (e.g., "mainnet", "testnet").
   * */
  getBalances(walletId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<BalanceEntry[]>;

  /**
   * Gets the total balances grouped by currency for the specified wallet.
   * @param {string} [walletId = activeWalledId] The ID of the wallet to get total balances for.
   * @param {NETWORK_ENVIRONMENT_VALUES} [environment] Optional filter for network environment (e.g., "mainnet", "testnet").
   */
  getTotals(walletId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<TotalBalance[]>;

  /**
   * Gets all balances for the specified wallet and currency on a specific network.
   * @param walletId The ID of the wallet to get balances for.
   * @param currencyAddress The address of the currency.
   * @param networkSlug The slug of the network.
   */
  getBalancesByCurrencyAndNetwork(
    walletId: string,
    currencyAddress: HexString,
    networkSlug: string,
  ): Promise<BalanceEntry[]>;
}

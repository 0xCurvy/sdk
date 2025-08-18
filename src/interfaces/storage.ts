import type { NETWORK_ENVIRONMENT_VALUES, NETWORK_FLAVOUR_VALUES, TOKENS } from "@/constants/networks";
import type { CurvyAddress } from "@/types/address";
import type { CurvyWalletData, ScanInfo } from "@/types/wallet";
import type { CurvyWallet } from "@/wallet";

export interface StorageInterface {
  storeCurvyAddress(address: CurvyAddress): Promise<void>;
  storeManyCurvyAddresses(addresses: CurvyAddress[]): Promise<void>;

  updateCurvyAddress(id: string, changes: Partial<CurvyAddress>): Promise<void>;
  updateManyCurvyAddresses(updates: Array<{ key: string; changes: Partial<CurvyAddress> }>): Promise<void>;

  getCurvyAddressById(id: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<CurvyAddress>;
  getCurvyAddressesByWalletId(walletId: string, environment?: NETWORK_ENVIRONMENT_VALUES): Promise<CurvyAddress[]>;
  getCurvyAddressesByWalletIdAndFlavour(
    walletId: string,
    networkFlavour: NETWORK_FLAVOUR_VALUES,
  ): Promise<CurvyAddress[]>;
  getAllCurvyAddresses(): Promise<CurvyAddress[]>;

  storeCurvyWallet(wallet: CurvyWallet): Promise<void>;
  updateCurvyWalletData(walletId: string, changes: Partial<CurvyWalletData>): Promise<void>;
  getCurvyWalletDataById(id: string): Promise<CurvyWalletData>;

  getLatestScanCursor(walletId: string): Promise<number | undefined>;
  getOldestScanCursor(walletId: string): Promise<number | undefined>;
  getScanInfo(walletId: string): Promise<ScanInfo>;

  updatePriceData(data: Map<TOKENS, string>): Promise<void>;
  getTokenPrice(token: TOKENS): Promise<string>;
  getAllTokenPrices(): Promise<Map<TOKENS, string>>;

  clearStorage(): Promise<void>;
}

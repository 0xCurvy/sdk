import type { NETWORK_ENVIRONMENT_VALUES, NETWORK_FLAVOUR_VALUES, NETWORKS } from "@/constants/networks";
import type { IApiClient } from "@/interfaces/api";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import type { MultiRpc } from "@/rpc/multi";
import type { ExtendedAnnouncement, GetStealthAddressReturnType, Note } from "@/types";
import type { CurvyAddress } from "@/types/address";
import type { Currency, Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import type { CurvyFeeEstimate, RpcCallReturnType, StarknetFeeEstimate } from "@/types/rpc";
import type { CurvySignatureParameters } from "@/types/signature";
import type { NetworkFilter } from "@/utils/network";

interface ICurvySDK {
  storage: StorageInterface;
  apiClient: IApiClient;

  // Getters
  get rpcClient(): MultiRpc;
  get activeNetworks(): Network[];
  get activeEnvironment(): NETWORK_ENVIRONMENT_VALUES;
  get walletManager(): IWalletManager;

  on: ICurvyEventEmitter["on"];
  off: ICurvyEventEmitter["off"];

  getStealthAddressById(id: string): Promise<CurvyAddress>;
  getNetwork(networkFilter?: NetworkFilter): Network;
  getNetworks(networkFilter?: NetworkFilter): Network[];
  getNetworkBySlug(networkSlug: NETWORKS): Network | undefined;

  generateNewShieldingAddress(networkIdentifier: NetworkFilter, handle: string): Promise<void>;

  generateNewStealthAddressForUser(
    networkIdentifier: NetworkFilter,
    handle: string,
  ): Promise<GetStealthAddressReturnType>;

  generateAndRegisterNewStealthAddressForUser(
    networkIdentifier: NetworkFilter,
    handle: string,
  ): Promise<{ address: HexString; announcementData: ExtendedAnnouncement }>;

  registerStealthAddressForUser(
    stealthAddressData: GetStealthAddressReturnType,
  ): Promise<{ address: HexString; announcementData: ExtendedAnnouncement }>;

  getAddressEncryptedMessage(address: CurvyAddress): Promise<string>;

  getNativeCurrencyForNetwork(network: Network): Currency;
  getSignatureParamsForNetworkFlavour(
    flavour: NETWORK_FLAVOUR_VALUES,
    ownerAddress: string,
    password: string,
  ): Promise<CurvySignatureParameters>;

  setActiveNetworks(networkFilter: NetworkFilter): void;
  switchNetworkEnvironment(environment: "mainnet" | "testnet"): void;

  // Actions

  refreshNoteBalances(walletId?: string): Promise<void>;
  refreshAddressBalances(address: CurvyAddress): Promise<void>;
  refreshWalletBalances(walletId?: string, scanAll?: boolean): Promise<void>;
  refreshBalances(scanAll?: boolean): Promise<void>;

  resetStorage(): Promise<void>;

  estimateFee(
    from: CurvyAddress,
    networkIdentifier: NetworkFilter,
    to: string,
    amount: string,
    currency: string,
  ): Promise<CurvyFeeEstimate>;
  send(
    from: CurvyAddress,
    networkIdentifier: NetworkFilter,
    to: string,
    amount: string,
    currency: string,
    fee: StarknetFeeEstimate | bigint,
    message?: string,
  ): Promise<RpcCallReturnType>;

  /**
   *  * Polls a function until the criteria is met or max retries is reached.
   *
   * @param pollFunction
   * @param pollCriteria
   * @param {number} [maxRetries=120] - Maximum number of retries
   * @param {number} [delayMs=10_000] - Delay between retries in milliseconds
   */
  pollForCriteria<T>(
    pollFunction: () => Promise<T>,
    pollCriteria: (res: T) => boolean,
    maxRetries?: number,
    delayMs?: number,
  ): Promise<T>;
  getNewNoteForUser(handle: string, token: bigint, amount: bigint): Promise<Note>;
}

export type { ICurvySDK };

import type { NETWORK_ENVIRONMENT_VALUES, NETWORK_FLAVOUR_VALUES, NETWORKS } from "@/constants/networks";
import type { IApiClient } from "@/interfaces/api";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import type { MultiRpc } from "@/rpc/multi";
import type {
  CurvyHandle,
  CurvyKeyPairs,
  CurvyPublicKeys,
  ExtendedAnnouncement,
  GetStealthAddressReturnType,
  Note,
} from "@/types";
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
  get walletManager(): IWalletManager;

  on: ICurvyEventEmitter["on"];
  off: ICurvyEventEmitter["off"];

  getStealthAddressById(id: string): Promise<CurvyAddress>;
  getNetwork(networkFilter?: NetworkFilter): Network;
  getNetworks(networkFilter?: NetworkFilter): Network[];
  getNetworkBySlug(networkSlug: NETWORKS): Network | undefined;

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
  switchNetworkEnvironment(environment?: NETWORK_ENVIRONMENT_VALUES): Promise<NETWORK_ENVIRONMENT_VALUES>;

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

  generateCurvyKeyPairs(): Promise<CurvyKeyPairs>;
  generateNewNote(handleOrKeys: CurvyHandle | CurvyPublicKeys, token: bigint, amount: bigint): Promise<Note>;
}

export type { ICurvySDK };

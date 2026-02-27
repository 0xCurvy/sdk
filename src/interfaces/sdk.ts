import type { NETWORK_ENVIRONMENT_VALUES, NETWORK_FLAVOUR_VALUES } from "@/constants/networks";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import type { MultiRpc } from "@/rpc/multi";
import type {
  CurvyId,
  EvmSignatureData,
  ExtendedAnnouncement,
  GetStealthAddressReturnType,
  RefreshOptions,
  StarknetSignatureData,
} from "@/types";
import type { CurvyAddress } from "@/types/address";
import type { Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import type { NetworkFilter } from "@/utils/network";
import type { CurvyWallet } from "@/wallet";

interface ICurvySDK {
  storage: StorageInterface;
  apiClient: IApiClient;

  // Getters
  get rpcClient(): MultiRpc;
  get activeNetworks(): Network[];
  get walletManager(): IWalletManager;
  get core(): Readonly<ICore>;

  on: ICurvyEventEmitter["on"];
  off: ICurvyEventEmitter["off"];

  login(
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
    password: string,
  ): Promise<CurvyWallet>;
  register(
    handle: CurvyId,
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
    password: string,
  ): Promise<CurvyWallet>;

  getNetwork(networkFilter?: NetworkFilter): Network;
  getNetworks(networkFilter?: NetworkFilter): Network[];
  switchNetworkEnvironment(environment?: NETWORK_ENVIRONMENT_VALUES): Promise<NETWORK_ENVIRONMENT_VALUES>;

  ensResolveCurvyId(handle: CurvyId, slip0044?: bigint): Promise<HexString>;

  generateEntryPortal(args: { curvyId: CurvyId; coinType?: string }): Promise<HexString>;

  generateExitPortal(args: {
    curvyId: CurvyId;
    exitNetworkId: number;
    exitAddress: string;
    coinType?: string;
  }): Promise<HexString>;
  generateExitPortal(args: { curvyId: CurvyId; exitCurrencyId?: number; coinType?: string }): Promise<HexString>;
  generateExitPortal(args: {
    curvyId: CurvyId;
    exitNetworkId?: number;
    exitAddress?: string;
    exitCurrencyId?: number;
    coinType?: string;
  }): Promise<HexString>;

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

  refreshAddressBalances(address: CurvyAddress): Promise<void>;
  refreshBalances(options: RefreshOptions & { scanAll?: boolean; type: "addresses" | "notes" | "all" }): Promise<void>;

  resetStorage(): Promise<void>;
}

export type { ICurvySDK };

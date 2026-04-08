import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import type { EstimatedPlan, Intent, IntentEstimation, PlanExecution } from "@/planner/type";
import type { MultiRpc } from "@/rpc/multi";
import type {
  BalanceEntry,
  CurvyId,
  EvmSignatureData,
  MatchedPortalRecord,
  RefreshOptions,
  TotalBalance,
} from "@/types";
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

  estimate(intent: Intent): Promise<IntentEstimation>;
  execute(plan: EstimatedPlan): Promise<PlanExecution>;

  getBalances(cached: boolean): Promise<BalanceEntry[]>;
  getTotals(cached: boolean): Promise<TotalBalance[]>;
  getBalancesByCurrencyAndNetwork(
    cached: boolean,
    currencyAddress: HexString,
    networkSlug: string,
  ): Promise<BalanceEntry[]>;

  login(signature: EvmSignatureData): Promise<CurvyWallet>;
  register(handle: CurvyId, signature: EvmSignatureData): Promise<CurvyWallet>;

  getNetwork(networkFilter?: NetworkFilter): Network;
  getNetworks(networkFilter?: NetworkFilter): Network[];
  switchNetworkEnvironment(environment?: NETWORK_ENVIRONMENT_VALUES): Promise<NETWORK_ENVIRONMENT_VALUES>;

  ensResolveCurvyId(handle: CurvyId, slip0044?: bigint): Promise<HexString>;

  generateEntryPortal(args: { curvyId: CurvyId; coinType?: string; currencyId?: number }): Promise<HexString>;

  generateExitPortal(args: {
    curvyId: CurvyId;
    currencyId: number;
    exitAddress: string;
    exitNetworkId?: number;
    exitCurrencyId?: number;
    coinType?: string;
  }): Promise<HexString>;

  refreshBalances(options: RefreshOptions): Promise<void>;

  findPortal(contractAddress: HexString, network: Network): Promise<MatchedPortalRecord | null>;
  recoverPortal(args: {
    networkId: number;
    tokenAddress: HexString;
    portalRecord: MatchedPortalRecord;
    destinationAddress: HexString;
  }): Promise<HexString>;

  resetStorage(): Promise<void>;
}

export type { ICurvySDK };

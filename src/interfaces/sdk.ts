import type { NETWORK_ENVIRONMENT_VALUES, NETWORK_FLAVOUR_VALUES, NETWORKS } from "@/constants/networks";
import type { IApiClient } from "@/interfaces/api";
import type { StorageInterface } from "@/interfaces/storage";
import type { IWalletManager } from "@/interfaces/wallet-manager";
import type { CommandPlanner } from "@/planner/planner";
import type { MultiRpc } from "@/rpc/multi";
import type {
  BalanceEntry,
  CsucAction,
  CsucActionPayload,
  CsucActionSet,
  CsucActionStatus,
  CsucBalanceEntry,
  CsucEstimatedActionCost,
  Note,
  SubmitGasSponsorshipRequestReturnType,
} from "@/types";
import type { CurvyAddress } from "@/types/address";
import type {
  AggregationRequest,
  AggregationRequestParams,
  DepositRequest,
  WithdrawRequest,
  WithdrawRequestParams,
} from "@/types/aggregator";
import type {
  Currency,
  GetAggregatorRequestStatusReturnType,
  Network,
  SubmitAggregationReturnType,
  SubmitDepositReturnType,
  SubmitWithdrawReturnType,
} from "@/types/api";
import type {
  BalanceRefreshCompleteEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshStartedEvent,
  ScanCompleteEvent,
  ScanErrorEvent,
  ScanMatchEvent,
  SyncCompleteEvent,
  SyncErrorEvent,
  SyncProgressEvent,
  SyncStartedEvent,
} from "@/types/events";
import type { HexString } from "@/types/helper";
import type { CurvyFeeEstimate, SendReturnType, StarknetFeeEstimate } from "@/types/rpc";
import type { CurvySignatureParameters } from "@/types/signature";
import type { NetworkFilter } from "@/utils/network";

interface ICurvySDK {
  storage: StorageInterface;
  apiClient: IApiClient;
  commandPlanner: CommandPlanner;

  // Getters
  get rpcClient(): Readonly<MultiRpc>;
  get activeNetworks(): Network[];
  get activeEnvironment(): NETWORK_ENVIRONMENT_VALUES;
  get walletManager(): IWalletManager;

  createWithdrawPayload(params: WithdrawRequestParams): WithdrawRequest;
  getStealthAddressById(id: string): Promise<CurvyAddress>;
  getNetwork(networkFilter?: NetworkFilter): Network;
  getNetworks(networkFilter?: NetworkFilter): Network[];
  getNetworkBySlug(networkSlug: NETWORKS): Network | undefined;

  getNewStealthAddressForUser(
    networkIdentifier: NetworkFilter,
    handle: string,
  ): Promise<{ address: HexString; id: string; pubKey: string }>;

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

  refreshNoteBalances(walletId: string): Promise<void>;
  refreshAddressBalances(address: CurvyAddress): Promise<void>;
  refreshWalletBalances(walletId: string): Promise<void>;
  refreshBalances(): Promise<void>;

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
  ): Promise<SendReturnType>;

  onboardToCSUC(
    input: BalanceEntry,
    toAddress: HexString,
    amount: string,
  ): Promise<SubmitGasSponsorshipRequestReturnType | undefined>;

  estimateActionInsideCSUC(
    networkFilter: NetworkFilter,
    actionId: CsucActionSet,
    from: HexString,
    to: HexString | bigint,
    token: HexString,
    _amount: bigint, // Doesn't accept decimal numbers i.e. `0.001`
  ): Promise<CsucEstimatedActionCost>;

  requestActionInsideCSUC(
    input: CsucBalanceEntry,
    payload: CsucActionPayload,
    totalFee: string,
  ): Promise<{ action: CsucAction; response: CsucActionStatus }>;

  createDeposit(payload: DepositRequest): Promise<SubmitDepositReturnType>;
  createWithdraw(payload: WithdrawRequest): Promise<SubmitWithdrawReturnType>;
  createAggregation(payload: AggregationRequest): Promise<SubmitAggregationReturnType>;
  getAggregatorRequestStatus(requestId: string): Promise<GetAggregatorRequestStatusReturnType>;

  // Event subscriptions
  onSyncStarted(listener: (event: SyncStartedEvent) => void): void;
  onSyncProgress(listener: (event: SyncProgressEvent) => void): void;
  onSyncComplete(listener: (event: SyncCompleteEvent) => void): void;
  onSyncError(listener: (event: SyncErrorEvent) => void): void;

  onScanMatch(listener: (event: ScanMatchEvent) => void): void;
  onScanProgress(listener: (event: ScanErrorEvent) => void): void;
  onScanComplete(listener: (event: ScanCompleteEvent) => void): void;
  onScanError(listener: (event: ScanErrorEvent) => void): void;

  onBalanceRefreshStarted(listener: (event: BalanceRefreshStartedEvent) => void): void;
  offBalanceRefreshStarted(listener: (event: BalanceRefreshStartedEvent) => void): void;
  onBalanceRefreshProgress(listener: (event: BalanceRefreshProgressEvent) => void): void;
  offBalanceRefreshProgress(listener: (event: BalanceRefreshProgressEvent) => void): void;
  onBalanceRefreshComplete(listener: (event: BalanceRefreshCompleteEvent) => void): void;
  offBalanceRefreshComplete(listener: (event: BalanceRefreshCompleteEvent) => void): void;
  createAggregationPayload(params: AggregationRequestParams): AggregationRequest;
  pollForCriteria<T>(
    pollFunction: () => Promise<T>,
    pollCriteria: (res: T) => boolean,
    maxRetries: number,
    delayMs: number,
  ): Promise<T>;
  getNewNoteForUser(handle: string, token: bigint, amount: bigint): Promise<Note>;

  resetAggregator(): Promise<void>;
}

export type { ICurvySDK };

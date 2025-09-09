import type { NETWORK_ENVIRONMENT_VALUES, NETWORK_FLAVOUR_VALUES, NETWORKS } from "@/constants/networks";
import type { MultiRpc } from "@/rpc/multi";
import type { CurvyAddress } from "@/types/address";
import type { AggregationRequest, DepositRequest, WithdrawRequest } from "@/types/aggregator";
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
  // Getters
  get rpcClient(): MultiRpc;
  get activeNetworks(): Network[];
  get activeEnvironment(): NETWORK_ENVIRONMENT_VALUES;

  getStealthAddressById(id: string): Promise<CurvyAddress>;
  getNetwork(networkFilter?: NetworkFilter): Network;
  getNetworks(networkFilter?: NetworkFilter): Network[];
  getNetworkBySlug(networkSlug: NETWORKS): Network | undefined;

  getNewStealthAddressForUser(
    networkIdentifier: NetworkFilter,
    handle: string,
  ): Promise<{ address: HexString; addressId: string; pubKey: string }>;

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
  pollForCriteria<T>(
    pollFunction: () => Promise<T>,
    pollCriteria: (res: T) => boolean,
    maxRetries: number,
    delayMs: number,
  ): Promise<T>;
}

export type { ICurvySDK };

import type { NETWORK_FLAVOUR, NETWORK_FLAVOUR_VALUES, NETWORKS } from "@/constants/networks";
import type { MultiRpc } from "@/rpc/multi";
import type { CurvyAddress } from "@/types/address";
import type {
  AggregationRequest,
  Currency,
  DepositPayload,
  GetAggregatorRequestStatusReturnType,
  Network,
  SubmitAggregationReturnType,
  SubmitDepositReturnType,
  SubmitWithdrawReturnType,
  WithdrawPayload,
} from "@/types/api";
import type { CurvyHandle } from "@/types/curvy";
import type {
  BalanceRefreshCompleteEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshStartedEvent,
  ScanCompleteEvent,
  ScanErrorEvent,
  ScanMatchEvent,
  SyncErrorEvent,
  SyncProgressEvent,
  SyncStartedEvent,
} from "@/types/events";
import type { HexString } from "@/types/helper";
import type { CurvyFeeEstimate, StarknetFeeEstimate } from "@/types/rpc";
import type { CurvySignatureParameters, EvmSignatureData, StarknetSignatureData } from "@/types/signature";
import type { NetworkFilter } from "@/utils/network";
import type { CurvyWallet } from "@/wallet";

interface ICurvySDK {
  // Getters
  get rpcClient(): MultiRpc;
  get wallets(): CurvyWallet[];
  get activeWallet(): CurvyWallet;
  hasActiveWallet(): boolean;

  getStealthAddressById(id: string): Promise<CurvyAddress>;
  getNetwork(networkFilter?: NetworkFilter): Network;
  getNetworks(networkFilter?: NetworkFilter): Network[];
  getNetworkBySlug(networkSlug: NETWORKS): Network | undefined;

  getNewStealthAddressForUser(
    networkIdentifier: NetworkFilter,
    handle: string,
  ): Promise<{ address: HexString; id: string; pubKey: string }>;

  getNativeCurrencyForNetwork(network: Network): Currency;
  getSignatureParamsForNetworkFlavour(
    flavour: NETWORK_FLAVOUR_VALUES,
    ownerAddress: string,
    password: string,
  ): Promise<CurvySignatureParameters>;

  setActiveNetworks(networkFilter: NetworkFilter): void;

  // Actions
  addWalletWithSignature(flavour: NETWORK_FLAVOUR["EVM"], signature: EvmSignatureData): Promise<CurvyWallet>;
  addWalletWithSignature(flavour: NETWORK_FLAVOUR["STARKNET"], signature: StarknetSignatureData): Promise<CurvyWallet>;
  addWalletWithSignature(
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
  ): Promise<CurvyWallet>;

  registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR["EVM"],
    signature: EvmSignatureData,
  ): Promise<CurvyWallet>;
  registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR["STARKNET"],
    signature: StarknetSignatureData,
  ): Promise<CurvyWallet>;
  registerWalletWithSignature(
    handle: CurvyHandle,
    flavour: NETWORK_FLAVOUR_VALUES,
    signature: EvmSignatureData | StarknetSignatureData,
  ): Promise<CurvyWallet>;

  removeWallet(walletId: string): Promise<void>;

  refreshWalletBalances(walletId: string): Promise<void>;
  refreshBalances(): Promise<void>;
  refreshAddressBalances(address: CurvyAddress): Promise<void>;
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
  ): Promise<string>;

  createDeposit(payload: DepositPayload): Promise<SubmitDepositReturnType>;
  createWithdraw(payload: WithdrawPayload): Promise<SubmitWithdrawReturnType>;
  createAggregation(payload: { aggregations: AggregationRequest[] }): Promise<SubmitAggregationReturnType>;
  getAggregatorRequestStatus(requestId: string): Promise<GetAggregatorRequestStatusReturnType>;

  // Event subscriptions
  onSyncStarted(listener: (event: SyncStartedEvent) => void): void;
  onSyncProgress(listener: (event: SyncProgressEvent) => void): void;
  onSyncComplete(listener: (event: SyncProgressEvent) => void): void;
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
}

export type { ICurvySDK };

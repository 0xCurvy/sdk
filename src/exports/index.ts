export { CurvySDK } from "../sdk";
export type { CurvyWallet } from "../wallet";

export { filterNetworks, type NetworkFilter } from "../utils/network";
export * from "../interfaces";

export * from "../types/address";
export * from "../types/aggregator";
export * from "../types/api";
export * from "../types/curvy";
export * from "../types/core";
export * from "../types/csuc";
export * from "../types/events";
export * from "../types/gas-sponsorship";
export * from "../types/rpc";
export * from "../types/signature";
export * from "../types/wallet";

export * from "../constants/networks";

export * from "../errors";
export * from "../utils/csuc";
export * from "../utils/common";

export * from "../contracts/evm/curvy-artifacts/ethereum-sepolia/CSUC";

export {
  SYNC_STARTED_EVENT,
  SYNC_ERROR_EVENT,
  SYNC_PROGRESS_EVENT,
  SCAN_PROGRESS_EVENT,
  SCAN_COMPLETE_EVENT,
  SCAN_ERROR_EVENT,
  SCAN_MATCH_EVENT,
  SYNC_COMPLETE_EVENT,
  BALANCE_REFRESH_COMPLETE_EVENT,
  BALANCE_REFRESH_PROGRESS_EVENT,
  BALANCE_REFRESH_STARTED_EVENT,
} from "@/constants/events";

export type {
  ScanErrorEvent,
  ScanMatchEvent,
  ScanCompleteEvent,
  ScanProgressEvent,
  SyncCompleteEvent,
  SyncErrorEvent,
  SyncStartedEvent,
  SyncProgressEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshCompleteEvent,
  BalanceRefreshStartedEvent,
} from "@/types/events";

import type { CurvyPlanExecution } from "@/planner/plan";
import type { CurvyAddress } from "@/types/address";
import type { RawAnnouncement } from "@/types/api";
import type { CurvyWallet } from "@/wallet";

//#region Sync events

type SyncStartedEvent = {
  total: number;
};

type SyncProgressEvent = {
  synced: number;
  announcements: RawAnnouncement[];
  remaining: number;
};

type SyncCompleteEvent = {
  totalSynced: number;
};

type SyncErrorEvent = {
  error: Error;
};

export type { SyncStartedEvent, SyncProgressEvent, SyncCompleteEvent, SyncErrorEvent };

//#endregion

//#region Scan events

type ScanMatchEvent = {
  wallet: CurvyWallet;
  stealthAddress: CurvyAddress;
};

type ScanProgressEvent = {
  scanned: number;
  wallet: CurvyWallet;
  total: number;
};

type ScanCompleteEvent = {
  scanned: number;
  matched: number;
  wallet: CurvyWallet;
  total: number;
};

type ScanErrorEvent = {
  wallet: CurvyWallet;
  error: Error;
};

export type { ScanMatchEvent, ScanProgressEvent, ScanCompleteEvent, ScanErrorEvent };

//#endregion

//#region Balance refresh events

type BalanceRefreshStartedEvent = {
  walletId: string;
};

type BalanceRefreshProgressEvent = {
  walletId: string;
  progress: number;
};

type BalanceRefreshCompleteEvent = {
  walletId: string;
};

export type { BalanceRefreshStartedEvent, BalanceRefreshProgressEvent, BalanceRefreshCompleteEvent };

//#endregion

//#region Plan Execution events

type PlanExecutionStartedEvent = {
  walletId: string;
};

type PlanExecutionProgressEvent = {
  walletId: string;
  result: CurvyPlanExecution;
};

type PlanExecutionCompleteEvent = PlanExecutionProgressEvent;

type PlanExecutionErrorEvent = PlanExecutionProgressEvent;

export type {
  PlanExecutionStartedEvent,
  PlanExecutionProgressEvent,
  PlanExecutionCompleteEvent,
  PlanExecutionErrorEvent,
};
//#endregion

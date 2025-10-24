import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { CurvyPlan, CurvyPlanExecution } from "@/planner/plan";
import type { CurvyAddress } from "@/types/address";
import type { RawAnnouncement } from "@/types/api";
import type { ExtractValues } from "@/types/helper";
import type { CurvyWallet } from "@/wallet";

export const CURVY_EVENT_TYPES = {
  SYNC_STARTED: "sync-started",
  SYNC_PROGRESS: "sync-progress",
  SYNC_COMPLETE: "sync-complete",
  SYNC_ERROR: "sync-error",

  SCAN_PROGRESS: "scan-progress",
  SCAN_COMPLETE: "scan-complete",
  SCAN_MATCH: "scan-match",
  SCAN_ERROR: "scan-error",

  BALANCE_REFRESH_STARTED: "balance-refresh-started",
  BALANCE_REFRESH_PROGRESS: "balance-refresh-progress",
  BALANCE_REFRESH_COMPLETE: "balance-refresh-complete",
  BALANCE_REFRESH_CANCELLED: "balance-refresh-cancelled",

  PLAN_EXECUTION_STARTED: "plan-execution-started",
  PLAN_COMMAND_EXECUTION_PROGRESS: "plan-command-execution-progress",
  PLAN_EXECUTION_PROGRESS: "plan-execution-progress",
  PLAN_EXECUTION_COMPLETE: "plan-execution-complete",
  PLAN_EXECUTION_ERROR: "plan-execution-error",
} as const;

export type CURVY_EVENTS = {
  [CURVY_EVENT_TYPES.SYNC_STARTED]: SyncStartedEvent;
  [CURVY_EVENT_TYPES.SYNC_PROGRESS]: SyncProgressEvent;
  [CURVY_EVENT_TYPES.SYNC_COMPLETE]: SyncCompleteEvent;
  [CURVY_EVENT_TYPES.SYNC_ERROR]: SyncErrorEvent;

  [CURVY_EVENT_TYPES.SCAN_PROGRESS]: ScanProgressEvent;
  [CURVY_EVENT_TYPES.SCAN_COMPLETE]: ScanCompleteEvent;
  [CURVY_EVENT_TYPES.SCAN_MATCH]: ScanMatchEvent;
  [CURVY_EVENT_TYPES.SCAN_ERROR]: ScanErrorEvent;

  [CURVY_EVENT_TYPES.BALANCE_REFRESH_STARTED]: BalanceRefreshStartedEvent;
  [CURVY_EVENT_TYPES.BALANCE_REFRESH_PROGRESS]: BalanceRefreshProgressEvent;
  [CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE]: BalanceRefreshCompleteEvent;
  [CURVY_EVENT_TYPES.BALANCE_REFRESH_CANCELLED]: BalanceRefreshCancelledEvent;

  [CURVY_EVENT_TYPES.PLAN_EXECUTION_STARTED]: PlanExecutionStartedEvent;
  [CURVY_EVENT_TYPES.PLAN_COMMAND_EXECUTION_PROGRESS]: PlanCommandExecutionProgressEvent;
  [CURVY_EVENT_TYPES.PLAN_EXECUTION_PROGRESS]: PlanExecutionProgressEvent;
  [CURVY_EVENT_TYPES.PLAN_EXECUTION_COMPLETE]: PlanExecutionCompleteEvent;
  [CURVY_EVENT_TYPES.PLAN_EXECUTION_ERROR]: PlanExecutionErrorEvent;
};

export type CurvyEventType = ExtractValues<typeof CURVY_EVENT_TYPES>;

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
  environment?: NETWORK_ENVIRONMENT_VALUES;
};

type BalanceRefreshProgressEvent = {
  walletId: string;
  progress: number;
  environment?: NETWORK_ENVIRONMENT_VALUES;
};

type BalanceRefreshCompleteEvent = {
  walletId: string;
  environment?: NETWORK_ENVIRONMENT_VALUES;
};

type BalanceRefreshCancelledEvent = {
  reason: string;
  environment?: NETWORK_ENVIRONMENT_VALUES;
};

export type {
  BalanceRefreshStartedEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshCompleteEvent,
  BalanceRefreshCancelledEvent,
};

//#endregion

//#region Plan Execution events

type PlanExecutionStartedEvent = {
  plan: CurvyPlan;
};

type PlanExecutionProgressEvent = {
  plan: CurvyPlan;
  result: CurvyPlanExecution;
};

type PlanCommandExecutionProgressEvent = {
  commandId: string;
};

type PlanExecutionCompleteEvent = PlanExecutionProgressEvent;

type PlanExecutionErrorEvent = PlanExecutionProgressEvent;

export type {
  PlanCommandExecutionProgressEvent,
  PlanExecutionStartedEvent,
  PlanExecutionProgressEvent,
  PlanExecutionCompleteEvent,
  PlanExecutionErrorEvent,
};
//#endregion

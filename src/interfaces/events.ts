import type EventEmitter from "eventemitter3";
import type {
  BalanceRefreshCompleteEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshStartedEvent,
  PlanCommandExecutionProgressEvent,
  PlanExecutionCompleteEvent,
  PlanExecutionErrorEvent,
  PlanExecutionProgressEvent,
  PlanExecutionStartedEvent,
  ScanCompleteEvent,
  ScanErrorEvent,
  ScanMatchEvent,
  ScanProgressEvent,
  SyncCompleteEvent,
  SyncErrorEvent,
  SyncProgressEvent,
  SyncStartedEvent,
} from "@/types/events";

interface ICurvyEventEmitter extends EventEmitter {
  emitSyncStarted(event: SyncStartedEvent): void;
  emitSyncProgress(event: SyncProgressEvent): void;
  emitSyncComplete(event: SyncCompleteEvent): void;
  emitSyncError(event: SyncErrorEvent): void;

  emitScanProgress(event: ScanProgressEvent): void;
  emitScanComplete(event: ScanCompleteEvent): void;
  emitScanMatch(event: ScanMatchEvent): void;
  emitScanError(event: ScanErrorEvent): void;

  emitBalanceRefreshStarted(event: BalanceRefreshStartedEvent): void;
  emitBalanceRefreshProgress(event: BalanceRefreshProgressEvent): void;
  emitBalanceRefreshComplete(event: BalanceRefreshCompleteEvent): void;

  emitPlanCommandExecutionProgress(event: PlanCommandExecutionProgressEvent): void;
  emitPlanExecutionStarted(event: PlanExecutionStartedEvent): void;
  emitPlanExecutionProgress(event: PlanExecutionProgressEvent): void;
  emitPlanExecutionComplete(event: PlanExecutionCompleteEvent): void;
  emitPlanExecutionError(event: PlanExecutionErrorEvent): void;
}

export type { ICurvyEventEmitter };

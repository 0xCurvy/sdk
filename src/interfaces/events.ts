import type Emittery from "emittery";
import type {
  BalanceRefreshCancelledEvent,
  BalanceRefreshCompleteEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshStartedEvent,
  CURVY_EVENTS,
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

interface ICurvyEventEmitter extends Emittery<CURVY_EVENTS> {
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
  emitBalanceRefreshCancelled(event: BalanceRefreshCancelledEvent): void;

  emitPlanCommandExecutionProgress(event: PlanCommandExecutionProgressEvent): void;
  emitPlanExecutionStarted(event: PlanExecutionStartedEvent): void;
  emitPlanExecutionProgress(event: PlanExecutionProgressEvent): void;
  emitPlanExecutionComplete(event: PlanExecutionCompleteEvent): void;
  emitPlanExecutionError(event: PlanExecutionErrorEvent): void;
}

export type { ICurvyEventEmitter };

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

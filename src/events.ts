import EventEmitter from "eventemitter3";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import {
  type BalanceRefreshCompleteEvent,
  type BalanceRefreshProgressEvent,
  type BalanceRefreshStartedEvent,
  CURVY_EVENT_TYPES,
  type PlanCommandExecutionProgressEvent,
  type PlanExecutionCompleteEvent,
  type PlanExecutionErrorEvent,
  type PlanExecutionProgressEvent,
  type PlanExecutionStartedEvent,
  type ScanCompleteEvent,
  type ScanErrorEvent,
  type ScanMatchEvent,
  type ScanProgressEvent,
  type SyncCompleteEvent,
  type SyncErrorEvent,
  type SyncProgressEvent,
  type SyncStartedEvent,
} from "@/types/events";

export class CurvyEventEmitter extends EventEmitter implements ICurvyEventEmitter {
  emitSyncStarted(event: SyncStartedEvent) {
    this.emit(CURVY_EVENT_TYPES.SYNC_STARTED, event);
  }

  emitSyncProgress(event: SyncProgressEvent) {
    this.emit(CURVY_EVENT_TYPES.SYNC_PROGRESS, event);
  }

  emitSyncComplete(event: SyncCompleteEvent) {
    this.emit(CURVY_EVENT_TYPES.SYNC_COMPLETE, event);
  }

  emitSyncError(event: SyncErrorEvent) {
    this.emit(CURVY_EVENT_TYPES.SYNC_ERROR, event);
  }

  emitScanProgress(event: ScanProgressEvent) {
    this.emit(CURVY_EVENT_TYPES.SCAN_PROGRESS, event);
  }

  emitScanComplete(event: ScanCompleteEvent) {
    this.emit(CURVY_EVENT_TYPES.SCAN_COMPLETE, event);
  }

  emitScanMatch(event: ScanMatchEvent) {
    this.emit(CURVY_EVENT_TYPES.SCAN_MATCH, event);
  }

  emitScanError(event: ScanErrorEvent) {
    this.emit(CURVY_EVENT_TYPES.SCAN_ERROR, event);
  }

  emitBalanceRefreshStarted(event: BalanceRefreshStartedEvent) {
    this.emit(CURVY_EVENT_TYPES.BALANCE_REFRESH_STARTED, event);
  }

  emitBalanceRefreshProgress(event: BalanceRefreshProgressEvent) {
    this.emit(CURVY_EVENT_TYPES.BALANCE_REFRESH_PROGRESS, event);
  }

  emitBalanceRefreshComplete(event: BalanceRefreshCompleteEvent) {
    this.emit(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, event);
  }

  emitPlanExecutionStarted(event: PlanExecutionStartedEvent) {
    this.emit(CURVY_EVENT_TYPES.PLAN_EXECUTION_STARTED, event);
  }

  emitPlanCommandExecutionProgress(event: PlanCommandExecutionProgressEvent) {
    this.emit(CURVY_EVENT_TYPES.PLAN_COMMAND_EXECUTION_PROGRESS, event);
  }

  emitPlanExecutionProgress(event: PlanExecutionProgressEvent) {
    this.emit(CURVY_EVENT_TYPES.PLAN_EXECUTION_PROGRESS, event);
  }

  emitPlanExecutionComplete(event: PlanExecutionCompleteEvent) {
    this.emit(CURVY_EVENT_TYPES.PLAN_EXECUTION_COMPLETE, event);
  }

  emitPlanExecutionError(event: PlanExecutionErrorEvent) {
    this.emit(CURVY_EVENT_TYPES.PLAN_EXECUTION_ERROR, event);
  }
}

import {
  BALANCE_REFRESH_COMPLETE_EVENT,
  BALANCE_REFRESH_PROGRESS_EVENT,
  BALANCE_REFRESH_STARTED_EVENT,
  SCAN_COMPLETE_EVENT,
  SCAN_ERROR_EVENT,
  SCAN_MATCH_EVENT,
  SCAN_PROGRESS_EVENT,
  SYNC_COMPLETE_EVENT,
  SYNC_ERROR_EVENT,
  SYNC_PROGRESS_EVENT,
  SYNC_STARTED_EVENT,
} from "@/constants/events";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import type {
  BalanceRefreshCompleteEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshStartedEvent,
  ScanCompleteEvent,
  ScanErrorEvent,
  ScanMatchEvent,
  ScanProgressEvent,
  SyncCompleteEvent,
  SyncErrorEvent,
  SyncProgressEvent,
  SyncStartedEvent,
} from "@/types/events";
import EventEmitter from "eventemitter3";

export class CurvyEventEmitter extends EventEmitter implements ICurvyEventEmitter {
  emitSyncStarted(event: SyncStartedEvent) {
    this.emit(SYNC_STARTED_EVENT, event);
  }

  emitSyncProgress(event: SyncProgressEvent) {
    this.emit(SYNC_PROGRESS_EVENT, event);
  }

  emitSyncComplete(event: SyncCompleteEvent) {
    this.emit(SYNC_COMPLETE_EVENT, event);
  }

  emitSyncError(event: SyncErrorEvent) {
    this.emit(SYNC_ERROR_EVENT, event);
  }

  emitScanProgress(event: ScanProgressEvent) {
    this.emit(SCAN_PROGRESS_EVENT, event);
  }

  emitScanComplete(event: ScanCompleteEvent) {
    this.emit(SCAN_COMPLETE_EVENT, event);
  }

  emitScanMatch(event: ScanMatchEvent) {
    this.emit(SCAN_MATCH_EVENT, event);
  }

  emitScanError(event: ScanErrorEvent) {
    this.emit(SCAN_ERROR_EVENT, event);
  }

  emitBalanceRefreshStarted(event: BalanceRefreshStartedEvent) {
    this.emit(BALANCE_REFRESH_STARTED_EVENT, event);
  }
  emitBalanceRefreshProgress(event: BalanceRefreshProgressEvent) {
    this.emit(BALANCE_REFRESH_PROGRESS_EVENT, event);
  }
  emitBalanceRefreshComplete(event: BalanceRefreshCompleteEvent) {
    this.emit(BALANCE_REFRESH_COMPLETE_EVENT, event);
  }
}

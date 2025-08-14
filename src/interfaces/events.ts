import type EventEmitter from "eventemitter3";
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
}

export type { ICurvyEventEmitter };

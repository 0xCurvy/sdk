import type Emittery from "emittery";
import type {
  AccountAddedEvent,
  AccountChangedEvent,
  AccountRemovedEvent,
  BalanceRefreshCancelledEvent,
  BalanceRefreshCompleteEvent,
  BalanceRefreshErrorEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshStartedEvent,
  CURVY_EVENTS,
  JwtRefreshErrorEvent,
  JwtRefreshSuccessEvent,
  PlanCommandExecutionProgressEvent,
  PlanExecutionCompleteEvent,
  PlanExecutionErrorEvent,
  PlanExecutionProgressEvent,
  PlanExecutionStartedEvent,
  UnauthorizedEvent,
} from "@/types/events";

interface ICurvyEventEmitter extends Emittery<CURVY_EVENTS> {
  emitBalanceRefreshStarted(event: BalanceRefreshStartedEvent): void;
  emitBalanceRefreshProgress(event: BalanceRefreshProgressEvent): void;
  emitBalanceRefreshComplete(event: BalanceRefreshCompleteEvent): void;
  emitBalanceRefreshCancelled(event: BalanceRefreshCancelledEvent): void;
  emitBalanceRefreshError(event: BalanceRefreshErrorEvent): void;

  emitPlanCommandExecutionProgress(event: PlanCommandExecutionProgressEvent): void;
  emitPlanExecutionStarted(event: PlanExecutionStartedEvent): void;
  emitPlanExecutionProgress(event: PlanExecutionProgressEvent): void;
  emitPlanExecutionComplete(event: PlanExecutionCompleteEvent): void;
  emitPlanExecutionError(event: PlanExecutionErrorEvent): void;

  emitJwtRefreshSuccess(event: JwtRefreshSuccessEvent): void;
  emitJwtRefreshError(event: JwtRefreshErrorEvent): void;

  emitUnauthorized(event: UnauthorizedEvent): void;

  emitAccountAdded(event: AccountAddedEvent): void;
  emitAccountRemoved(event: AccountRemovedEvent): void;
  emitAccountChanged(event: AccountChangedEvent): void;
}

export type { ICurvyEventEmitter };

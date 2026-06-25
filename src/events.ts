import Emittery from "emittery";
import type { ICurvyEventEmitter } from "@/interfaces/events";
import {
  type AccountAddedEvent,
  type AccountChangedEvent,
  type AccountRemovedEvent,
  type BalanceRefreshCancelledEvent,
  type BalanceRefreshCompleteEvent,
  type BalanceRefreshErrorEvent,
  type BalanceRefreshProgressEvent,
  type BalanceRefreshStartedEvent,
  CURVY_EVENT_TYPES,
  type CURVY_EVENTS,
  type JwtRefreshErrorEvent,
  type JwtRefreshSuccessEvent,
  type PlanCommandExecutionProgressEvent,
  type PlanExecutionCompleteEvent,
  type PlanExecutionErrorEvent,
  type PlanExecutionProgressEvent,
  type PlanExecutionStartedEvent,
  type UnauthorizedEvent,
} from "@/types/events";

export class CurvyEventEmitter extends Emittery<CURVY_EVENTS> implements ICurvyEventEmitter {
  emitBalanceRefreshStarted(event: BalanceRefreshStartedEvent) {
    this.emit(CURVY_EVENT_TYPES.BALANCE_REFRESH_STARTED, event);
  }

  emitBalanceRefreshProgress(event: BalanceRefreshProgressEvent) {
    this.emit(CURVY_EVENT_TYPES.BALANCE_REFRESH_PROGRESS, event);
  }

  emitBalanceRefreshComplete(event: BalanceRefreshCompleteEvent) {
    this.emit(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, event);
  }

  emitBalanceRefreshCancelled(event: BalanceRefreshCancelledEvent) {
    this.emit(CURVY_EVENT_TYPES.BALANCE_REFRESH_CANCELLED, event);
  }

  emitBalanceRefreshError(event: BalanceRefreshErrorEvent) {
    this.emit(CURVY_EVENT_TYPES.BALANCE_REFRESH_ERROR, event);
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

  emitJwtRefreshSuccess(event: JwtRefreshSuccessEvent) {
    this.emit(CURVY_EVENT_TYPES.JWT_REFRESH_SUCCESS, event);
  }

  emitJwtRefreshError(event: JwtRefreshErrorEvent) {
    this.emit(CURVY_EVENT_TYPES.JWT_REFRESH_ERROR, event);
  }

  emitUnauthorized(event: UnauthorizedEvent) {
    this.emit(CURVY_EVENT_TYPES.UNAUTHORIZED, event);
  }

  emitAccountAdded(event: AccountAddedEvent) {
    this.emit(CURVY_EVENT_TYPES.ACCOUNT_ADDED, event);
  }

  emitAccountRemoved(event: AccountRemovedEvent) {
    this.emit(CURVY_EVENT_TYPES.ACCOUNT_REMOVED, event);
  }

  emitAccountChanged(event: AccountChangedEvent) {
    this.emit(CURVY_EVENT_TYPES.ACCOUNT_CHANGED, event);
  }
}

import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { ScanError } from "@/errors";
import type { Plan, PlanExecution } from "@/planner/types";
import type { ExtractValues } from "@/types/helper";

export const CURVY_EVENT_TYPES = {
  BALANCE_REFRESH_STARTED: "balance-refresh-started",
  BALANCE_REFRESH_PROGRESS: "balance-refresh-progress",
  BALANCE_REFRESH_COMPLETE: "balance-refresh-complete",
  BALANCE_REFRESH_CANCELLED: "balance-refresh-cancelled",
  BALANCE_REFRESH_ERROR: "balance-refresh-error",

  PLAN_EXECUTION_STARTED: "plan-execution-started",
  PLAN_COMMAND_EXECUTION_PROGRESS: "plan-command-execution-progress",
  PLAN_EXECUTION_PROGRESS: "plan-execution-progress",
  PLAN_EXECUTION_COMPLETE: "plan-execution-complete",
  PLAN_EXECUTION_ERROR: "plan-execution-error",

  JWT_REFRESH_SUCCESS: "jwt-refresh-success",
  JWT_REFRESH_ERROR: "jwt-refresh-error",

  UNAUTHORIZED: "unauthorized",

  ACCOUNT_ADDED: "account-added",
  ACCOUNT_REMOVED: "account-removed",
  ACCOUNT_CHANGED: "account-changed",
} as const;

export type CURVY_EVENTS = {
  [CURVY_EVENT_TYPES.BALANCE_REFRESH_STARTED]: BalanceRefreshStartedEvent;
  [CURVY_EVENT_TYPES.BALANCE_REFRESH_PROGRESS]: BalanceRefreshProgressEvent;
  [CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE]: BalanceRefreshCompleteEvent;
  [CURVY_EVENT_TYPES.BALANCE_REFRESH_CANCELLED]: BalanceRefreshCancelledEvent;
  [CURVY_EVENT_TYPES.BALANCE_REFRESH_ERROR]: BalanceRefreshErrorEvent;

  [CURVY_EVENT_TYPES.PLAN_EXECUTION_STARTED]: PlanExecutionStartedEvent;
  [CURVY_EVENT_TYPES.PLAN_COMMAND_EXECUTION_PROGRESS]: PlanCommandExecutionProgressEvent;
  [CURVY_EVENT_TYPES.PLAN_EXECUTION_PROGRESS]: PlanExecutionProgressEvent;
  [CURVY_EVENT_TYPES.PLAN_EXECUTION_COMPLETE]: PlanExecutionCompleteEvent;
  [CURVY_EVENT_TYPES.PLAN_EXECUTION_ERROR]: PlanExecutionErrorEvent;

  [CURVY_EVENT_TYPES.JWT_REFRESH_SUCCESS]: JwtRefreshSuccessEvent;
  [CURVY_EVENT_TYPES.JWT_REFRESH_ERROR]: JwtRefreshErrorEvent;

  [CURVY_EVENT_TYPES.UNAUTHORIZED]: UnauthorizedEvent;

  [CURVY_EVENT_TYPES.ACCOUNT_ADDED]: AccountAddedEvent;
  [CURVY_EVENT_TYPES.ACCOUNT_REMOVED]: AccountRemovedEvent;
  [CURVY_EVENT_TYPES.ACCOUNT_CHANGED]: AccountChangedEvent;
};

export type CurvyEventType = ExtractValues<typeof CURVY_EVENT_TYPES>;

//#region Balance refresh events

type BalanceRefreshStartedEvent = {
  accountId: string;
  environment?: NETWORK_ENVIRONMENT_VALUES;
};

type BalanceRefreshProgressEvent = {
  accountId: string;
  progress: number;
  environment?: NETWORK_ENVIRONMENT_VALUES;
};

type BalanceRefreshCompleteEvent = {
  accountId: string;
  environment?: NETWORK_ENVIRONMENT_VALUES;
};

type BalanceRefreshCancelledEvent = {
  reason: string;
  environment?: NETWORK_ENVIRONMENT_VALUES;
};

/** Fired when balance scanning fails (it may still have completed partially). */
type BalanceRefreshErrorEvent = {
  error: ScanError;
  environment?: NETWORK_ENVIRONMENT_VALUES;
};

export type {
  BalanceRefreshStartedEvent,
  BalanceRefreshProgressEvent,
  BalanceRefreshCompleteEvent,
  BalanceRefreshCancelledEvent,
  BalanceRefreshErrorEvent,
};

//#endregion

//#region Plan Execution events

type PlanExecutionStartedEvent = {
  plan: Plan;
};

type PlanExecutionProgressEvent = {
  plan: Plan;
  result: PlanExecution;
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

//#region JWT refresh events

/** Fired when the bearer token is successfully refreshed. */
type JwtRefreshSuccessEvent = Record<string, never>;

/** Fired when a bearer-token refresh fails; the previous token stays active. */
type JwtRefreshErrorEvent = {
  error: Error;
};

export type { JwtRefreshSuccessEvent, JwtRefreshErrorEvent };
//#endregion

//#region Auth events

type UnauthorizedEvent = {
  statusCode: number;
  path?: string;
  /** The `X-Request-ID` correlation id of the rejected request, when available. */
  requestId?: string;
};

export type { UnauthorizedEvent };

//#endregion

//#region Account lifecycle events

/** Fired after an account is added to the store. */
type AccountAddedEvent = {
  accountId: string;
};

/** Fired after an account is removed from the store. */
type AccountRemovedEvent = {
  accountId: string;
};

/** Fired after the active account changes. Both fields are `null` on disconnect. */
type AccountChangedEvent = {
  accountId: string | null;
  previousAccountId: string | null;
};

export type { AccountAddedEvent, AccountRemovedEvent, AccountChangedEvent };

//#endregion

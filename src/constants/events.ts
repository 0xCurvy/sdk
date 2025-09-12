//#region Sync events

const SYNC_STARTED_EVENT = "sync-started";
const SYNC_PROGRESS_EVENT = "sync-progress";
const SYNC_COMPLETE_EVENT = "sync-complete";
const SYNC_ERROR_EVENT = "sync-error";

export { SYNC_STARTED_EVENT, SYNC_PROGRESS_EVENT, SYNC_COMPLETE_EVENT, SYNC_ERROR_EVENT };

//#endregion

//#region Scan events

const SCAN_PROGRESS_EVENT = "scan-progress";
const SCAN_COMPLETE_EVENT = "scan-complete";
const SCAN_MATCH_EVENT = "scan-match";
const SCAN_ERROR_EVENT = "scan-error";

export { SCAN_PROGRESS_EVENT, SCAN_COMPLETE_EVENT, SCAN_MATCH_EVENT, SCAN_ERROR_EVENT };

//#endregion

//#region Balance refresh events

const BALANCE_REFRESH_STARTED_EVENT = "balance-refresh-started";
const BALANCE_REFRESH_PROGRESS_EVENT = "balance-refresh-progress";
const BALANCE_REFRESH_COMPLETE_EVENT = "balance-refresh-complete";

export { BALANCE_REFRESH_STARTED_EVENT, BALANCE_REFRESH_PROGRESS_EVENT, BALANCE_REFRESH_COMPLETE_EVENT };

//#endregion

//#region Planner Executor events

const PLAN_EXECUTION_STARTED_EVENT = "plan-execution-started";
const PLAN_EXECUTION_PROGRESS_EVENT = "plan-execution-progress";
const PLAN_EXECUTION_COMPLETE_EVENT = "plan-execution-complete";
const PLAN_EXECUTION_ERROR_EVENT = "plan-execution-error";

export {
  PLAN_EXECUTION_STARTED_EVENT,
  PLAN_EXECUTION_PROGRESS_EVENT,
  PLAN_EXECUTION_COMPLETE_EVENT,
  PLAN_EXECUTION_ERROR_EVENT,
};

//#endregion

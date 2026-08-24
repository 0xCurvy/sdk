export type CurvyErrorCode =
  | "ACCOUNT_ERROR"
  | "AGGREGATION_OUTPUT_TIMEOUT"
  | "AGGREGATOR_SUBMIT_ERROR"
  | "API_ERROR"
  | "AUTH_ERROR"
  | "COMMAND_ERROR"
  | "FEE_ESTIMATE_UNAVAILABLE"
  | "INSUFFICIENT_BALANCE"
  | "MISSING_CONTRACT_ADDRESS"
  | "NETWORK_ERROR"
  | "NO_ACTIVE_ACCOUNT"
  | "NO_CONFIG"
  | "PLAN_ESTIMATION_ERROR"
  | "PLAN_EXECUTION_ERROR"
  | "PLAN_WAIT_TIMEOUT"
  | "RELAY_ERROR"
  | "ROUTE_UNAVAILABLE"
  | "SCAN_ERROR"
  | "SPEND_KEY_REQUIRED"
  | "STORAGE_ERROR"
  | "UNKNOWN_ERROR"
  | "VIEW_KEY_REQUIRED";

class CurvyError<Code extends string = CurvyErrorCode> extends Error {
  constructor(
    message: string,
    public readonly code: Code,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CurvyError";
  }
}

/** Convert a thrown value into the SDK's stable error contract. */
function normalizeCurvyError(error: unknown, fallbackMessage = "An unexpected SDK error occurred."): CurvyError {
  if (error instanceof CurvyError) return error;
  if (error instanceof Error) return new CurvyError(error.message, "UNKNOWN_ERROR", { cause: error });
  return new CurvyError(fallbackMessage, "UNKNOWN_ERROR", { cause: error });
}

class StorageError extends CurvyError {
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message, "STORAGE_ERROR");
    this.name = "StorageError";
  }
}

class APIError extends CurvyError {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: unknown,
    /** The `X-Request-ID` correlation id sent with the request, for tracing. */
    public requestId?: string,
  ) {
    super(message, "API_ERROR");
    this.name = "APIError";
  }
}

/**
 * Thrown by `getCurvyConfig()` (and any action that resolves the ambient
 * config) when no global config has been created and none was passed
 * explicitly. Create one with `createCurvyConfig(...)`.
 */
class NoCurvyConfigError extends CurvyError {
  constructor() {
    super("No Curvy config is set. Call createCurvyConfig(...) first, or pass `config` explicitly.", "NO_CONFIG");
    this.name = "NoCurvyConfigError";
  }
}

/**
 * Thrown by account-scoped actions when no `accountId` was provided and there is
 * no active account in the config store to fall back to.
 */
class NoActiveAccountError extends CurvyError {
  constructor() {
    super("No active account. Authenticate first, or pass `accountId` explicitly.", "NO_ACTIVE_ACCOUNT");
    this.name = "NoActiveAccountError";
  }
}

/** A command in a plan failed during execution. */
class PlanExecutionError extends CurvyError {
  constructor(
    message: string,
    public commandId?: string,
    public commandName?: string,
    public originalError?: Error,
    public causes?: CurvyError[],
  ) {
    super(message, "PLAN_EXECUTION_ERROR", { cause: originalError });
    this.name = "PlanExecutionError";
  }
}

/** A command in a plan failed during fee/amount estimation. */
class PlanEstimationError extends CurvyError {
  constructor(
    message: string,
    public commandId?: string,
    public commandName?: string,
    public originalError?: Error,
    public causes?: CurvyError[],
  ) {
    super(message, "PLAN_ESTIMATION_ERROR", { cause: originalError });
    this.name = "PlanEstimationError";
  }
}

/** A planner command failed to build or validate. */
class CommandError extends CurvyError {
  constructor(
    message: string,
    public commandName?: string,
  ) {
    super(message, "COMMAND_ERROR");
    this.name = "CommandError";
  }
}

class InsufficientBalanceError extends CurvyError {
  constructor(
    public readonly required: bigint,
    public readonly available: bigint,
    public readonly networkSlug?: string,
    public readonly currencyAddress?: string,
  ) {
    super(`Insufficient balance: required ${required}, available ${available}.`, "INSUFFICIENT_BALANCE");
    this.name = "InsufficientBalanceError";
  }
}

class FeeEstimateUnavailableError extends CurvyError {
  constructor(message = "A relay-ready fee estimate is currently unavailable.", options?: ErrorOptions) {
    super(message, "FEE_ESTIMATE_UNAVAILABLE", options);
    this.name = "FeeEstimateUnavailableError";
  }
}

/** No supported bridge or swap route can fulfill the requested delivery. */
class RouteUnavailableError extends CurvyError {
  constructor(message = "No supported route is currently available.", options?: ErrorOptions) {
    super(message, "ROUTE_UNAVAILABLE", options);
    this.name = "RouteUnavailableError";
  }
}

class PlanWaitTimeoutError extends CurvyError {
  constructor(
    public readonly waitId: string,
    public readonly waitName: string,
  ) {
    super(`Timed out while ${waitName}.`, "PLAN_WAIT_TIMEOUT");
    this.name = "PlanWaitTimeoutError";
  }
}

/** Note scanning failed for a network. */
class ScanError extends CurvyError {
  constructor(
    message: string,
    public networkSlug?: string,
  ) {
    super(message, "SCAN_ERROR");
    this.name = "ScanError";
  }
}

/** An RPC / network-level operation failed. */
class NetworkError extends CurvyError {
  constructor(
    message: string,
    public networkSlug?: string,
  ) {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

/** Authentication (login / register / token) failed. */
class AuthError extends CurvyError {
  constructor(message: string) {
    super(message, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

/** An account-scoped operation failed. */
class AccountError extends CurvyError {
  constructor(
    message: string,
    public accountId?: string,
  ) {
    super(message, "ACCOUNT_ERROR");
    this.name = "AccountError";
  }
}

/**
 * Thrown when an operation needs a spending key but the resolved account has
 * none (e.g. signing or registration on a view-only / key-less account). Raised
 * by the `SpendKey` brand / `requireSpendKey` accessor instead of letting an
 * empty key reach a crypto primitive and fail silently.
 */
class SpendKeyRequiredError extends CurvyError {
  constructor() {
    super("This operation requires a spending key, but the account has none.", "SPEND_KEY_REQUIRED");
    this.name = "SpendKeyRequiredError";
  }
}

/** Thrown when an operation needs a viewing key but the resolved account has none. */
class ViewKeyRequiredError extends CurvyError {
  constructor() {
    super("This operation requires a viewing key, but the account has none.", "VIEW_KEY_REQUIRED");
    this.name = "ViewKeyRequiredError";
  }
}

/** Thrown when submitting a built aggregator proof on-chain fails (revert, no account, etc.). */
class AggregatorSubmitError extends CurvyError {
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message, "AGGREGATOR_SUBMIT_ERROR");
    this.name = "AggregatorSubmitError";
  }
}

/** Thrown when relaying a built aggregator proof via the relay service fails. */
class RelayError extends CurvyError {
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message, "RELAY_ERROR");
    this.name = "RelayError";
  }
}

/** The relay landed, but the locally-owned aggregation output was not observed before the UI deadline. */
class AggregationOutputTimeoutError extends CurvyError {
  constructor() {
    super(
      "Aggregation was submitted, but its resulting balance was not detected before the configured deadline. It may still complete in the background; refresh balances before trying again.",
      "AGGREGATION_OUTPUT_TIMEOUT",
    );
    this.name = "AggregationOutputTimeoutError";
  }
}

/** Thrown when a contract address needed for a submission is missing (e.g. the aggregator address). */
class MissingContractAddressError extends CurvyError {
  constructor(message: string) {
    super(message, "MISSING_CONTRACT_ADDRESS");
    this.name = "MissingContractAddressError";
  }
}

export {
  CurvyError,
  normalizeCurvyError,
  StorageError,
  APIError,
  NoCurvyConfigError,
  NoActiveAccountError,
  PlanExecutionError,
  PlanEstimationError,
  CommandError,
  InsufficientBalanceError,
  FeeEstimateUnavailableError,
  RouteUnavailableError,
  PlanWaitTimeoutError,
  ScanError,
  NetworkError,
  AuthError,
  AccountError,
  SpendKeyRequiredError,
  ViewKeyRequiredError,
  AggregatorSubmitError,
  RelayError,
  AggregationOutputTimeoutError,
  MissingContractAddressError,
};

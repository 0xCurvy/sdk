class CurvyError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "CurvyError";
  }
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
    public causes?: Error[],
  ) {
    super(message, "PLAN_EXECUTION_ERROR");
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
    public causes?: Error[],
  ) {
    super(message, "PLAN_ESTIMATION_ERROR");
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

/** Thrown when a contract address needed for a submission is missing (e.g. the aggregator address). */
class MissingContractAddressError extends CurvyError {
  constructor(message: string) {
    super(message, "MISSING_CONTRACT_ADDRESS");
    this.name = "MissingContractAddressError";
  }
}

export {
  CurvyError,
  StorageError,
  APIError,
  NoCurvyConfigError,
  NoActiveAccountError,
  PlanExecutionError,
  PlanEstimationError,
  CommandError,
  ScanError,
  NetworkError,
  AuthError,
  AccountError,
  SpendKeyRequiredError,
  ViewKeyRequiredError,
  AggregatorSubmitError,
  RelayError,
  MissingContractAddressError,
};

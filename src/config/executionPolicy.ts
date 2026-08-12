import type { ExecutionPolicy } from "./types";

export const DEFAULT_EXECUTION_POLICY: Readonly<ExecutionPolicy> = Object.freeze({
  relayPollAttempts: 120,
  relayPollIntervalMs: 3_000,
  planWaitAttempts: 30,
  planWaitIntervalMs: 10_000,
  aggregationOutputTimeoutMs: 240_000,
  aggregationOutputPollIntervalMs: 10_000,
  shieldSettleDelayMs: 10_000,
});

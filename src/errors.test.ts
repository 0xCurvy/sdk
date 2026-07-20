import { describe, expect, it } from "vitest";
import {
  AccountError,
  AggregationOutputTimeoutError,
  APIError,
  AuthError,
  CommandError,
  CurvyError,
  NetworkError,
  PlanEstimationError,
  PlanExecutionError,
  ScanError,
} from "./errors";

describe("domain errors", () => {
  it("are CurvyError instances carrying a stable code and name", () => {
    const cases: Array<[CurvyError, string, string]> = [
      [new PlanExecutionError("x", "cmd-1", "Withdraw"), "PLAN_EXECUTION_ERROR", "PlanExecutionError"],
      [new PlanEstimationError("x", "cmd-1", "Withdraw"), "PLAN_ESTIMATION_ERROR", "PlanEstimationError"],
      [new CommandError("x", "Withdraw"), "COMMAND_ERROR", "CommandError"],
      [new ScanError("x", "ethereum"), "SCAN_ERROR", "ScanError"],
      [new NetworkError("x", "ethereum"), "NETWORK_ERROR", "NetworkError"],
      [new AuthError("x"), "AUTH_ERROR", "AuthError"],
      [new AccountError("x", "acc-1"), "ACCOUNT_ERROR", "AccountError"],
      [new AggregationOutputTimeoutError(), "AGGREGATION_OUTPUT_TIMEOUT", "AggregationOutputTimeoutError"],
    ];

    for (const [error, code, name] of cases) {
      expect(error).toBeInstanceOf(CurvyError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(code);
      expect(error.name).toBe(name);
    }
  });

  it("preserves contextual fields", () => {
    const exec = new PlanExecutionError("boom", "cmd-1", "Withdraw", new Error("root"), [new Error("a")]);
    expect(exec.commandId).toBe("cmd-1");
    expect(exec.commandName).toBe("Withdraw");
    expect(exec.originalError?.message).toBe("root");
    expect(exec.causes).toHaveLength(1);

    expect(new ScanError("x", "ethereum").networkSlug).toBe("ethereum");
    expect(new AccountError("x", "acc-1").accountId).toBe("acc-1");
  });

  it("carries the request id on APIError", () => {
    const err = new APIError("nope", 503, { error: "x" }, "req-123");
    expect(err.statusCode).toBe(503);
    expect(err.requestId).toBe("req-123");
  });
});

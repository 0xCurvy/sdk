import { describe, expect, it, vi } from "vitest";
import { NoActiveAccountError } from "@/errors";
import type { EstimatedPlan } from "@/planner/types";
import { createFakeConfig, fakeBalanceEntry, fakeCurvyAccount } from "@/test/fixtures";
import type { CurvyId } from "@/types";
import { CURVY_EVENT_TYPES } from "@/types/events";
import { executePlan } from "./executePlan";

const LOCK_KEY = "refresh-account-account-a";

/** A config with an active account (state + live map). */
function buildConfig({ withAccount = true }: { withAccount?: boolean } = {}) {
  return createFakeConfig({
    activeAccountId: withAccount ? "account-a" : null,
    accounts: withAccount
      ? {
          "account-a": {
            id: "account-a",
            createdAt: 1_700_000_000_000,
            ownerAddress: "0x000000000000000000000000000000000000000a",
            curvyHandle: "alice.curvy.name" as CurvyId,
            scanCursors: { latest: undefined, oldest: undefined },
          },
        }
      : {},
    liveAccounts: withAccount ? new Map([["account-a", fakeCurvyAccount()]]) : new Map(),
  });
}

describe("executePlan", () => {
  it("throws NoActiveAccountError when there is no active account", async () => {
    const config = buildConfig({ withAccount: false });
    const plan: EstimatedPlan = { type: "data", data: fakeBalanceEntry({ id: "d" }) };
    await expect(executePlan({ plan, config })).rejects.toBeInstanceOf(NoActiveAccountError);
  });

  it("emits started + complete and threads data through a data-only plan", async () => {
    const config = buildConfig();
    const started = vi.fn();
    const complete = vi.fn();
    const error = vi.fn();
    config.emitter.on(CURVY_EVENT_TYPES.PLAN_EXECUTION_STARTED, started);
    config.emitter.on(CURVY_EVENT_TYPES.PLAN_EXECUTION_COMPLETE, complete);
    config.emitter.on(CURVY_EVENT_TYPES.PLAN_EXECUTION_ERROR, error);

    const plan: EstimatedPlan = {
      type: "serial",
      items: [{ type: "data", data: fakeBalanceEntry({ id: "d1", balance: 500n }) }],
    };

    const result = await executePlan({ plan, config });

    expect(result.success).toBe(true);
    if (result.success) expect((result.data as { id: string }).id).toBe("d1");
    expect(started).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("pauses balance refresh before execution and resumes it after", async () => {
    const config = buildConfig();

    // A wait node lets us observe the lock state mid-execution: pause must have
    // already fired (lock === true) by the time the plan body runs.
    let lockDuringExecution: boolean | undefined;
    const plan: EstimatedPlan = {
      type: "serial",
      items: [
        { type: "data", data: fakeBalanceEntry({ id: "d1" }) },
        {
          type: "wait",
          id: "w1",
          name: "probe",
          condition: async () => {
            lockDuringExecution = config._internal.scanLocks.get(LOCK_KEY);
            return true;
          },
        },
      ],
    };

    await executePlan({ plan, config });

    // Paused (true) while executing...
    expect(lockDuringExecution).toBe(true);
    // ...and resumed (false) once execution completed.
    expect(config._internal.scanLocks.get(LOCK_KEY)).toBe(false);
  });

  it("emits error and rethrows when a wait node's condition fails, still resuming refresh", async () => {
    const config = buildConfig();
    const complete = vi.fn();
    const error = vi.fn();
    config.emitter.on(CURVY_EVENT_TYPES.PLAN_EXECUTION_COMPLETE, complete);
    config.emitter.on(CURVY_EVENT_TYPES.PLAN_EXECUTION_ERROR, error);

    // A throwing condition makes `pollForCriteria` rethrow on the first attempt
    // (no `shouldRetry` => no polling delay), so the wait handler returns the
    // timeout-shaped failure without the 30 × 10s polling wall-clock cost.
    const plan: EstimatedPlan = {
      type: "serial",
      items: [
        { type: "data", data: fakeBalanceEntry({ id: "d1" }) },
        {
          type: "wait",
          id: "w-fail",
          name: "never-met",
          condition: async () => {
            throw new Error("portal not deployed");
          },
        },
      ],
    };

    await expect(executePlan({ plan, config })).rejects.toThrow(
      "Timeout: never-met condition was not met within the expected time.",
    );
    expect(error).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
    // Resume still runs even on failure.
    expect(config._internal.scanLocks.get(LOCK_KEY)).toBe(false);
  });
});

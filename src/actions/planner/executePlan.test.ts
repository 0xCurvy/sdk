import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoActiveAccountError } from "@/errors";
import type { EstimatedPlan } from "@/planner/types";
import { hasBytecode } from "@/rpc/hasBytecode";
import { createFakeConfig, fakeBalanceEntry, fakeCurvyAccount, fixtureNetwork } from "@/test/fixtures";
import type { CurvyId, HexString } from "@/types";
import { CURVY_EVENT_TYPES } from "@/types/events";
import { executePreparedPlan } from "./executePlan";

vi.mock("@/rpc/hasBytecode", () => ({ hasBytecode: vi.fn() }));

const LOCK_KEY = "refresh-account-account-a";
const PORTAL_ADDRESS = "0x0000000000000000000000000000000000000001" as HexString;

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
    networks: [fixtureNetwork()],
  });
}

describe("executePreparedPlan", () => {
  beforeEach(() => {
    vi.mocked(hasBytecode).mockResolvedValue(true);
  });

  it("throws NoActiveAccountError when there is no active account", async () => {
    const config = buildConfig({ withAccount: false });
    const plan: EstimatedPlan = { type: "data", data: [fakeBalanceEntry({ id: "d" })] };
    await expect(executePreparedPlan({ plan, config })).rejects.toBeInstanceOf(NoActiveAccountError);
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
      items: [{ type: "data", data: [fakeBalanceEntry({ id: "d1", balance: 500n })] }],
    };

    const result = await executePreparedPlan({ plan, config });

    expect(result.success).toBe(true);
    if (result.success && Array.isArray(result.data)) expect(result.data[0].id).toBe("d1");
    expect(started).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("pauses balance refresh before execution and resumes it after", async () => {
    const config = buildConfig();

    let lockDuringExecution: boolean | undefined;
    vi.mocked(hasBytecode).mockImplementation(async () => {
      lockDuringExecution = config._internal.scanLocks.get(LOCK_KEY);
      return true;
    });
    const plan: EstimatedPlan = {
      type: "serial",
      items: [
        { type: "data", data: [fakeBalanceEntry({ id: "d1" })] },
        {
          type: "wait",
          id: "w1",
          name: "probe",
          condition: { kind: "contract-code", networkSlug: "ethereum", address: PORTAL_ADDRESS },
        },
      ],
    };

    await executePreparedPlan({ plan, config });

    expect(lockDuringExecution).toBe(true);
    expect(config._internal.scanLocks.get(LOCK_KEY)).toBe(false);
  });

  it("emits error and rethrows when a wait node's condition fails, still resuming refresh", async () => {
    const config = buildConfig();
    const complete = vi.fn();
    const error = vi.fn();
    config.emitter.on(CURVY_EVENT_TYPES.PLAN_EXECUTION_COMPLETE, complete);
    config.emitter.on(CURVY_EVENT_TYPES.PLAN_EXECUTION_ERROR, error);

    vi.mocked(hasBytecode).mockRejectedValue(new Error("portal not deployed"));
    const plan: EstimatedPlan = {
      type: "serial",
      items: [
        { type: "data", data: [fakeBalanceEntry({ id: "d1" })] },
        {
          type: "wait",
          id: "w-fail",
          name: "never-met",
          condition: { kind: "contract-code", networkSlug: "ethereum", address: PORTAL_ADDRESS },
        },
      ],
    };

    await expect(executePreparedPlan({ plan, config })).rejects.toThrow("Timed out while never-met.");
    expect(error).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
    expect(config._internal.scanLocks.get(LOCK_KEY)).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createFakeConfig } from "@/test/fixtures";
import { CURVY_EVENT_TYPES } from "@/types/events";
import { on } from "./on";

describe("on", () => {
  it("registers a listener that receives emitted events", async () => {
    const config = createFakeConfig();
    const listener = vi.fn();

    on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, listener, { config });
    await config.emitter.emitBalanceRefreshComplete({ accountId: "w1" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ accountId: "w1" });
  });

  it("returns an unsubscribe function that stops delivery", async () => {
    const config = createFakeConfig();
    const listener = vi.fn();

    const unsubscribe = on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, listener, { config });
    unsubscribe();
    await config.emitter.emitBalanceRefreshComplete({ accountId: "w1" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("resolves the ambient global config when none is passed", async () => {
    const config = createFakeConfig();
    const { setCurvyConfig } = await import("@/config/global");
    setCurvyConfig(config);
    try {
      const listener = vi.fn();
      on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, listener);
      await config.emitter.emitBalanceRefreshComplete({ accountId: "w1" });
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      setCurvyConfig(null);
    }
  });

  it("auto-unsubscribes when the provided AbortSignal fires", async () => {
    const config = createFakeConfig();
    const listener = vi.fn();
    const controller = new AbortController();

    on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, listener, { config, signal: controller.signal });
    controller.abort();
    await config.emitter.emitBalanceRefreshComplete({ accountId: "w1" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("never registers when the AbortSignal is already aborted", async () => {
    const config = createFakeConfig();
    const listener = vi.fn();

    on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, listener, { config, signal: AbortSignal.abort() });
    await config.emitter.emitBalanceRefreshComplete({ accountId: "w1" });

    expect(listener).not.toHaveBeenCalled();
  });
});

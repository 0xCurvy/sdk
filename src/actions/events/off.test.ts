import { describe, expect, it, vi } from "vitest";
import { createFakeConfig } from "@/test/fixtures";
import { CURVY_EVENT_TYPES } from "@/types/events";
import { off } from "./off";
import { on } from "./on";

describe("off", () => {
  it("removes a listener by identity so it stops receiving events", async () => {
    const config = createFakeConfig();
    const listener = vi.fn();

    on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, listener, { config });
    off(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, listener, config);
    await config.emitter.emitBalanceRefreshComplete({ accountId: "w1" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("only removes the matching listener identity, leaving others subscribed", async () => {
    const config = createFakeConfig();
    const keep = vi.fn();
    const drop = vi.fn();

    on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, keep, { config });
    on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, drop, { config });
    off(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, drop, config);
    await config.emitter.emitBalanceRefreshComplete({ accountId: "w1" });

    expect(drop).not.toHaveBeenCalled();
    expect(keep).toHaveBeenCalledTimes(1);
  });
});

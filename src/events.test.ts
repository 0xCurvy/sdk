import { describe, expect, it, vi } from "vitest";
import { ScanError } from "@/errors";
import { CurvyEventEmitter } from "./events";

describe("CurvyEventEmitter (new lifecycle/refresh events)", () => {
  it("delivers account lifecycle events to subscribers", async () => {
    const emitter = new CurvyEventEmitter();
    const added = vi.fn();
    const changed = vi.fn();
    const removed = vi.fn();

    emitter.on("account-added", added);
    emitter.on("account-changed", changed);
    emitter.on("account-removed", removed);

    emitter.emitAccountAdded({ accountId: "acc-1" });
    emitter.emitAccountChanged({ accountId: "acc-1", previousAccountId: null });
    emitter.emitAccountRemoved({ accountId: "acc-1" });
    await Promise.resolve();

    expect(added).toHaveBeenCalledWith({ accountId: "acc-1" });
    expect(changed).toHaveBeenCalledWith({ accountId: "acc-1", previousAccountId: null });
    expect(removed).toHaveBeenCalledWith({ accountId: "acc-1" });
  });

  it("delivers JWT refresh and balance-refresh-error events", async () => {
    const emitter = new CurvyEventEmitter();
    const ok = vi.fn();
    const fail = vi.fn();
    const scanFail = vi.fn();

    emitter.on("jwt-refresh-success", ok);
    emitter.on("jwt-refresh-error", fail);
    emitter.on("balance-refresh-error", scanFail);

    const jwtError = new Error("expired");
    const scanError = new ScanError("scan boom", "ethereum");
    emitter.emitJwtRefreshSuccess({});
    emitter.emitJwtRefreshError({ error: jwtError });
    emitter.emitBalanceRefreshError({ error: scanError });
    await Promise.resolve();

    expect(ok).toHaveBeenCalledWith({});
    expect(fail).toHaveBeenCalledWith({ error: jwtError });
    expect(scanFail).toHaveBeenCalledWith({ error: scanError });
  });
});

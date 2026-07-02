import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncNotes } from "@/actions/notes/syncNotes";
import { NoActiveAccountError } from "@/errors";
import { accounts, createFakeConfig } from "@/test/fixtures";
import { CURVY_EVENT_TYPES } from "@/types/events";
import { refreshBalances } from "./refreshBalances";

// refreshBalances now owns only the scan choreography (lock + state + events) and
// delegates the actual work to syncNotes. Mock that seam (vitest hoists this above
// the imports) so these tests assert the choreography in isolation; syncNotes has
// its own end-to-end coverage.
vi.mock("@/actions/notes/syncNotes", () => ({ syncNotes: vi.fn(async () => []) }));

describe("refreshBalances", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits started then complete and flips scan status back to idle", async () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });

    const events: string[] = [];
    config.emitter.on(CURVY_EVENT_TYPES.BALANCE_REFRESH_STARTED, () => {
      events.push("started");
    });
    config.emitter.on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, () => {
      events.push("complete");
    });

    await refreshBalances({ accountId, config });

    expect(events).toEqual(["started", "complete"]);
    expect(config.state.scan.status).toBe("idle");
    expect(config.state.scan.accountId).toBe(accountId);
  });

  it("notifies store subscribers when scan state changes", async () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });

    const seen: string[] = [];
    config.subscribe(
      (state) => state.scan.status,
      (status) => seen.push(status),
    );

    await refreshBalances({ accountId, config });

    expect(seen).toContain("scanning");
    expect(seen.at(-1)).toBe("idle");
  });

  it("suppresses events when silent", async () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });

    let count = 0;
    config.emitter.on(CURVY_EVENT_TYPES.BALANCE_REFRESH_STARTED, () => {
      count += 1;
    });

    await refreshBalances({ accountId, silent: true, config });

    expect(count).toBe(0);
  });

  it("is re-entrancy guarded per account", async () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });

    config._internal.scanLocks.set(`refresh-account-${accountId}`, true);
    let started = 0;
    config.emitter.on(CURVY_EVENT_TYPES.BALANCE_REFRESH_STARTED, () => {
      started += 1;
    });

    await refreshBalances({ accountId, config });

    expect(started).toBe(0); // skipped because a refresh is already in flight
    expect(vi.mocked(syncNotes)).not.toHaveBeenCalled();
  });

  it("throws NoActiveAccountError when no account is active and none provided", async () => {
    const config = createFakeConfig({ activeAccountId: null });
    await expect(refreshBalances({ config })).rejects.toBeInstanceOf(NoActiveAccountError);
  });

  it("delegates to syncNotes for the account and completes the choreography", async () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });

    await refreshBalances({ accountId, config });

    expect(vi.mocked(syncNotes)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(syncNotes)).toHaveBeenCalledWith(expect.objectContaining({ accountId, config }));
    expect(config.state.scan.status).toBe("idle");
    expect(config.state.scan.progress).toBe(100);
  });

  it("emits cancelled and returns when the signal is already aborted", async () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });

    const controller = new AbortController();
    controller.abort();

    let cancelled = 0;
    let completed = 0;
    config.emitter.on(CURVY_EVENT_TYPES.BALANCE_REFRESH_CANCELLED, () => {
      cancelled += 1;
    });
    config.emitter.on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, () => {
      completed += 1;
    });

    await refreshBalances({ accountId, signal: controller.signal, config });

    expect(cancelled).toBe(1);
    expect(completed).toBe(0);
    // Cancelled, not failed — the scan lands back at idle, not "error".
    expect(config.state.scan.status).toBe("idle");
    expect(vi.mocked(syncNotes)).not.toHaveBeenCalled(); // aborted before delegating
    // lock released even on the abort path
    expect(config._internal.scanLocks.get(`refresh-account-${accountId}`)).toBe(false);
  });

  it("recognizes a STRING abort reason as cancellation (env-switch-abort), not a hard error", async () => {
    const accountId = accounts[0].id;
    const config = createFakeConfig({ activeAccountId: accountId });

    // The frontend aborts with a string reason: controller.abort("env-switch-abort").
    // `throwIfAborted()` throws that string verbatim (not an Error), which used to
    // fall through the `instanceof Error` guards → no cancelled event → the
    // env-switch recovery never re-synced the new environment.
    const controller = new AbortController();
    controller.abort("env-switch-abort");

    let cancelled = 0;
    let cancelReason = "";
    config.emitter.on(CURVY_EVENT_TYPES.BALANCE_REFRESH_CANCELLED, ({ reason }) => {
      cancelled += 1;
      cancelReason = reason ?? "";
    });

    // Must resolve (not reject) — a swallowed string abort used to reject the run.
    await expect(refreshBalances({ accountId, signal: controller.signal, config })).resolves.toBeUndefined();

    expect(cancelled).toBe(1);
    expect(cancelReason).toBe("env-switch-abort");
    expect(config.state.scan.status).toBe("idle");
    expect(config._internal.scanLocks.get(`refresh-account-${accountId}`)).toBe(false);
  });
});

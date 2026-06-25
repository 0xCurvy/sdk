import { describe, expect, it, vi } from "vitest";
import { createFakeConfig, fakeBalanceEntry, fakeCurvyAccount } from "@/test/fixtures";
import { resetStorage } from "./resetStorage";

describe("resetStorage", () => {
  it("clears storage, re-inserts non-partial accounts, and refreshes their balances", async () => {
    const account = fakeCurvyAccount();
    const config = createFakeConfig({
      activeAccountId: account.id,
      liveAccounts: new Map([[account.id, account]]),
    });

    // Seed a balance so we can prove `clearStorage` wiped it.
    await config.storage.updateBalanceEntries(account.id, "ethereum", [fakeBalanceEntry({ accountId: account.id })]);
    expect(await config.storage.getBalances(account.id)).toHaveLength(1);

    await resetStorage({ config });

    // Storage was cleared (balances gone).
    expect(await config.storage.getBalances(account.id)).toHaveLength(0);

    // Account metadata was re-inserted from the live registry.
    const restored = await config.storage.getCurvyAccountDataById(account.id);
    expect(restored.id).toBe(account.id);

    // refreshBalances ran (its scan choreography flips state back to idle@100).
    expect(config.state.scan.status).toBe("idle");
    expect(config.state.scan.progress).toBe(100);
    expect(config.state.scan.accountId).toBe(account.id);
  });

  it("restarts the price-refresh timer (stop -> start) across the reset", async () => {
    const config = createFakeConfig();

    await resetStorage({ config });

    // A timer handle is present after reset (started with runImmediately).
    expect(config._internal.timers.price).toBeDefined();

    // Cleanup so the interval doesn't leak across tests.
    config._internal.timers.price?.cancel();
    config._internal.timers.price = undefined;
  });

  it("skips partial accounts without throwing (serialize() would throw)", async () => {
    // A partial account (null handle) — `storage.insertCurvyAccount` -> serialize()
    // throws for partials; resetStorage must skip it.
    const partial = fakeCurvyAccount({ curvyHandle: null });
    expect(partial.isPartial).toBe(true);

    const full = fakeCurvyAccount();
    const config = createFakeConfig({
      activeAccountId: full.id,
      liveAccounts: new Map([
        [partial.id, partial],
        [full.id, full],
      ]),
    });

    const insertSpy = vi.spyOn(config.storage, "insertCurvyAccount");

    await expect(resetStorage({ config })).resolves.toBeUndefined();

    // Only the full account was inserted; the partial was skipped.
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const inserted = insertSpy.mock.calls[0][0];
    expect(inserted.id).toBe(full.id);

    config._internal.timers.price?.cancel();
    config._internal.timers.price = undefined;
  });
});

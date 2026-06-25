import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeApi, createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { setActiveAccount } from "./setActiveAccount";

describe("setActiveAccount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("flips activeAccountId and triggers a bearer-token round trip", async () => {
    const api = createFakeApi();
    api.auth.GetBearerTotp = vi.fn(async () => "nonce-123");
    api.auth.CreateBearerToken = vi.fn(async () => "token-abc");

    const account = fakeCurvyAccount();
    const config = createFakeConfig({ api, liveAccounts: new Map([[account.id, account]]) });

    await setActiveAccount({ config, accountId: account.id });

    expect(config.state.activeAccountId).toBe(account.id);
    expect(api.auth.GetBearerTotp).toHaveBeenCalledTimes(1);
    expect(api.auth.CreateBearerToken).toHaveBeenCalledWith(expect.objectContaining({ nonce: "nonce-123" }));
    expect(api.updateBearerToken).toHaveBeenCalledWith("token-abc");
    // JWT refresh timer started for a non-partial active account.
    expect(config._internal.timers.jwtRefresh).toBeDefined();
  });

  it("skips the bearer-token update when skipBearerTokenUpdate is set", async () => {
    const api = createFakeApi();
    api.auth.GetBearerTotp = vi.fn(async () => "nonce-123");
    api.auth.CreateBearerToken = vi.fn(async () => "token-abc");

    const account = fakeCurvyAccount();
    const config = createFakeConfig({ api, liveAccounts: new Map([[account.id, account]]) });

    await setActiveAccount({ config, accountId: account.id, skipBearerTokenUpdate: true });

    expect(config.state.activeAccountId).toBe(account.id);
    expect(api.auth.GetBearerTotp).not.toHaveBeenCalled();
    expect(api.updateBearerToken).not.toHaveBeenCalled();
  });

  it("does not authenticate a partial account but still starts the timer guard", async () => {
    const api = createFakeApi();
    api.auth.GetBearerTotp = vi.fn(async () => "nonce-123");

    const account = fakeCurvyAccount({ curvyHandle: null, ownerAddress: null });
    const config = createFakeConfig({ api, liveAccounts: new Map([[account.id, account]]) });

    await setActiveAccount({ config, accountId: account.id });

    expect(config.state.activeAccountId).toBe(account.id);
    expect(api.auth.GetBearerTotp).not.toHaveBeenCalled();
    // Partial active account => no JWT refresh timer.
    expect(config._internal.timers.jwtRefresh).toBeUndefined();
  });

  it("throws when the account has no keyring entry", async () => {
    const config = createFakeConfig();

    await expect(setActiveAccount({ config, accountId: "missing" })).rejects.toThrow(
      "Account with id missing does not exist.",
    );
  });
});

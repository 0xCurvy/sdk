import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JWT_REFRESH_INTERVAL } from "@/constants/intervals";
import { createFakeApi, createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { SpendKey } from "@/utils/keys";
import { startJwtRefresh, stopJwtRefresh, updateBearerToken } from "./session";

describe("session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("updateBearerToken", () => {
    it("TOTP-signs the nonce and pushes the resulting token", async () => {
      const api = createFakeApi();
      api.auth.GetBearerTotp = vi.fn(async () => "the-nonce");
      api.auth.CreateBearerToken = vi.fn(async ({ nonce }) => `token-for-${nonce}`);
      const config = createFakeConfig({ api });

      await updateBearerToken(config, SpendKey("11".padStart(64, "0")));

      expect(api.auth.GetBearerTotp).toHaveBeenCalledTimes(1);
      expect(api.auth.CreateBearerToken).toHaveBeenCalledWith(
        expect.objectContaining({ nonce: "the-nonce", signature: expect.any(String) }),
      );
      expect(api.updateBearerToken).toHaveBeenCalledWith("token-for-the-nonce");
    });
  });

  describe("startJwtRefresh / stopJwtRefresh", () => {
    it("starts a refresh timer for a non-partial active account and refreshes on tick", async () => {
      const api = createFakeApi();
      api.auth.RefreshBearerToken = vi.fn(async () => "refreshed");
      const account = fakeCurvyAccount();
      const config = createFakeConfig({
        api,
        liveAccounts: new Map([[account.id, account]]),
        activeAccountId: account.id,
      });

      startJwtRefresh(config);
      expect(config._internal.timers.jwtRefresh).toBeDefined();

      await vi.advanceTimersByTimeAsync(JWT_REFRESH_INTERVAL);
      expect(api.auth.RefreshBearerToken).toHaveBeenCalledTimes(1);

      stopJwtRefresh(config);
      expect(config._internal.timers.jwtRefresh).toBeUndefined();
    });

    it("does not start a timer when the active account is partial", () => {
      const account = fakeCurvyAccount({ curvyHandle: null, ownerAddress: null });
      const config = createFakeConfig({
        liveAccounts: new Map([[account.id, account]]),
        activeAccountId: account.id,
      });

      startJwtRefresh(config);
      expect(config._internal.timers.jwtRefresh).toBeUndefined();
    });

    it("does not start a second timer if one is already running", () => {
      const account = fakeCurvyAccount();
      const config = createFakeConfig({
        liveAccounts: new Map([[account.id, account]]),
        activeAccountId: account.id,
      });

      startJwtRefresh(config);
      const first = config._internal.timers.jwtRefresh;
      startJwtRefresh(config);
      expect(config._internal.timers.jwtRefresh).toBe(first);
    });

    it("stopJwtRefresh is a no-op when no timer is running", () => {
      const config = createFakeConfig();
      expect(() => stopJwtRefresh(config)).not.toThrow();
      expect(config._internal.timers.jwtRefresh).toBeUndefined();
    });
  });
});

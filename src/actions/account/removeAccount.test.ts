import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { removeAccount } from "./removeAccount";

describe("removeAccount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("evicts a partial account from the keyring without disturbing a different active session", async () => {
    const full = fakeCurvyAccount({ keyPairs: { s: "aa".padStart(64, "0") } });
    const partial = fakeCurvyAccount({ curvyHandle: null, ownerAddress: null });

    const config = createFakeConfig({
      liveAccounts: new Map([
        ["full-a", full],
        ["partial-1", partial],
      ]),
      activeAccountId: "full-a",
    });

    await removeAccount({ config, accountId: "partial-1" });

    // Partial is gone...
    expect(config.keyring.has("partial-1")).toBe(false);
    // ...but the active (registered) session is untouched.
    expect(config.keyring.has("full-a")).toBe(true);
    expect(config.state.activeAccountId).toBe("full-a");
    expect(config.state.accounts["full-a"]).toBeDefined();
    expect(config.api.updateBearerToken).not.toHaveBeenCalled();
  });

  it("clears activeAccountId and the bearer token when the removed account is active", async () => {
    const full = fakeCurvyAccount();

    const config = createFakeConfig({
      liveAccounts: new Map([["full-a", full]]),
      activeAccountId: "full-a",
    });

    await removeAccount({ config, accountId: "full-a" });

    expect(config.keyring.has("full-a")).toBe(false);
    expect(config.state.accounts["full-a"]).toBeUndefined();
    expect(config.state.activeAccountId).toBeNull();
    expect(config.api.updateBearerToken).toHaveBeenCalledWith(undefined);
  });

  it("is a no-op for an unknown account id", async () => {
    const config = createFakeConfig({ activeAccountId: null });

    await expect(removeAccount({ config, accountId: "does-not-exist" })).resolves.toBeUndefined();
    expect(config.api.updateBearerToken).not.toHaveBeenCalled();
  });
});

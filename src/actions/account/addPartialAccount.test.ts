import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapStorage } from "@/storage/map-storage";
import { createFakeConfig, fakeKeyPairs } from "@/test/fixtures";
import { addPartialAccount } from "./addPartialAccount";

describe("addPartialAccount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("creates a handle-less, owner-less account and makes it active without persisting", async () => {
    const storage = new MapStorage();
    const config = createFakeConfig({ storage });

    const account = await addPartialAccount({ config, keyPairs: { s: fakeKeyPairs().s, v: fakeKeyPairs().v } });

    expect(account.isPartial).toBe(true);
    expect(account.curvyHandle).toBeNull();
    expect(account.ownerAddress).toBeNull();

    // Keys live in the keyring and the account is active...
    expect(config.keyring.get(account.id)).toBe(account.keyPairs);
    expect(config.state.activeAccountId).toBe(account.id);

    // ...but never mirrored to state or persisted (it's partial).
    expect(config.state.accounts[account.id]).toBeUndefined();
    await expect(storage.getCurvyAccountDataById(account.id)).rejects.toThrow();

    // Partial => bearer token untouched.
    expect(config.api.updateBearerToken).not.toHaveBeenCalled();
  });
});

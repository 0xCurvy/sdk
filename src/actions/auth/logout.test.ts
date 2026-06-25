import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapStorage } from "@/storage/map-storage";
import { createFakeApi, createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { addAccount } from "../account/addAccount";
import { logout } from "./logout";

function fakeAuthApi() {
  const api = createFakeApi();
  api.auth.GetBearerTotp = vi.fn(async () => "nonce");
  api.auth.CreateBearerToken = vi.fn(async () => "token");
  return api;
}

describe("logout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("removes the account from every store and re-points the active account", async () => {
    const api = fakeAuthApi();
    const config = createFakeConfig({ api, storage: new MapStorage() });

    const a = fakeCurvyAccount({ keyPairs: { s: "aa".padStart(64, "0") }, curvyHandle: "a.curvy.name" as never });
    const b = fakeCurvyAccount({ keyPairs: { s: "bb".padStart(64, "0") }, curvyHandle: "b.curvy.name" as never });
    await addAccount({ config, account: a });
    await addAccount({ config, account: b }); // b is now active (last added)

    expect(config.state.activeAccountId).toBe(b.id);

    await logout({ config, accountId: b.id });

    // Cleared bearer token at the start of removal.
    expect(api.updateBearerToken).toHaveBeenCalledWith(undefined);
    // b is gone from both the keyring and the metadata mirror.
    expect(config.keyring.has(b.id)).toBe(false);
    expect(config.state.accounts[b.id]).toBeUndefined();
    // a remains and becomes the active account.
    expect(config.keyring.has(a.id)).toBe(true);
    expect(config.state.activeAccountId).toBe(a.id);
  });

  it("clears the active account when the last account is removed", async () => {
    const api = fakeAuthApi();
    const config = createFakeConfig({ api, storage: new MapStorage() });

    const account = fakeCurvyAccount();
    await addAccount({ config, account });
    expect(config.state.activeAccountId).toBe(account.id);

    await logout({ config }); // defaults to active account id

    expect(config.keyring.size).toBe(0);
    expect(config.state.accounts[account.id]).toBeUndefined();
    expect(config.state.activeAccountId).toBeNull();
  });

  it("throws when the account does not exist", async () => {
    const config = createFakeConfig();
    await expect(logout({ config, accountId: "missing" })).rejects.toThrow("Account with id missing does not exist.");
  });
});

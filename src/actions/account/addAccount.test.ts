import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapStorage } from "@/storage/map-storage";
import { createFakeApi, createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { addAccount } from "./addAccount";

describe("addAccount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("registers the live account, mirrors metadata, persists it, and makes it active", async () => {
    const api = createFakeApi();
    api.auth.GetBearerTotp = vi.fn(async () => "nonce");
    api.auth.CreateBearerToken = vi.fn(async () => "token");

    const storage = new MapStorage();
    const config = createFakeConfig({ api, storage });
    const account = fakeCurvyAccount();

    await addAccount({ config, account });

    // Raw keypairs live in the keyring (the sole runtime home of key material).
    expect(config.keyring.get(account.id)).toBe(account.keyPairs);

    // Key-free metadata mirrored into state.accounts.
    expect(config.state.accounts[account.id]).toEqual({
      id: account.id,
      createdAt: account.createdAt,
      ownerAddress: account.ownerAddress,
      curvyHandle: account.curvyHandle,
      scanCursors: { latest: undefined, oldest: undefined },
    });
    // No private keys ever leak into state.
    expect(JSON.stringify(config.state.accounts[account.id])).not.toContain(account.keyPairs.s);

    // Durably persisted.
    await expect(storage.getCurvyAccountDataById(account.id)).resolves.toMatchObject({ id: account.id });

    // Became active + authenticated.
    expect(config.state.activeAccountId).toBe(account.id);
    expect(api.updateBearerToken).toHaveBeenCalledWith("token");
  });

  it("is idempotent — re-adding the same account (repeat login) does not throw", async () => {
    const api = createFakeApi();
    api.auth.GetBearerTotp = vi.fn(async () => "nonce");
    api.auth.CreateBearerToken = vi.fn(async () => "token");

    const storage = new MapStorage();
    const config = createFakeConfig({ api, storage });
    const account = fakeCurvyAccount();

    await addAccount({ config, account });
    // A second add of the same deterministic-id account must not throw
    // "already exists" — it should upsert and remain active.
    await expect(addAccount({ config, account })).resolves.toBeUndefined();

    expect(config.state.activeAccountId).toBe(account.id);
    expect(Object.keys(config.state.accounts)).toEqual([account.id]);
    await expect(storage.getCurvyAccountDataById(account.id)).resolves.toMatchObject({ id: account.id });
  });

  it("does not mirror, persist, or authenticate a partial account", async () => {
    const api = createFakeApi();
    api.auth.GetBearerTotp = vi.fn(async () => "nonce");

    const storage = new MapStorage();
    const config = createFakeConfig({ api, storage });
    const account = fakeCurvyAccount({ curvyHandle: null, ownerAddress: null });

    await addAccount({ config, account });

    expect(config.keyring.get(account.id)).toBe(account.keyPairs);
    expect(config.state.accounts[account.id]).toBeUndefined();
    await expect(storage.getCurvyAccountDataById(account.id)).rejects.toThrow();
    expect(config.state.activeAccountId).toBe(account.id);
    expect(api.auth.GetBearerTotp).not.toHaveBeenCalled();
  });
});

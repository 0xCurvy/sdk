import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionKeystore } from "@/session-keystore";
import { MapStorage } from "@/storage/map-storage";
import { createFakeApi, createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { restoreSession } from "./restoreSession";

/** Minimal in-memory stand-in for the browser `SessionKeystore` (Node has none). */
function fakeKeystore(entries: Record<string, string>): SessionKeystore {
  const map = new Map(Object.entries(entries));
  return {
    get size() {
      return map.size;
    },
    get: (k: string) => map.get(k) ?? null,
    set: (k: string, v: string) => map.set(k, v),
    delete: (k: string) => map.delete(k),
    has: (k: string) => map.has(k),
    keys: () => map.keys(),
  } as unknown as SessionKeystore;
}

describe("restoreSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("is a no-op when there is no keystore (Node)", async () => {
    const config = createFakeConfig();
    await restoreSession({ config });
    expect(config.keyring.size).toBe(0);
  });

  it("restores the JWT first then rebuilds each persisted account (skipping re-auth)", async () => {
    const api = createFakeApi();
    api.auth.GetBearerTotp = vi.fn(async () => "nonce");
    api.auth.CreateBearerToken = vi.fn(async () => "token");

    const storage = new MapStorage();
    const account = fakeCurvyAccount();
    // Seed durable metadata (as a prior session would have via addAccount).
    await storage.insertCurvyAccount(account.serialize());

    const keystore = fakeKeystore({
      __jwt__: "persisted-jwt",
      [account.id]: JSON.stringify(account.keyPairs),
    });

    const config = createFakeConfig({ api, storage });
    // createFakeConfig hard-codes keystore: null; inject the fake.
    (config as { keystore: SessionKeystore | null }).keystore = keystore;

    await restoreSession({ config });

    // JWT restored up front.
    expect(api.updateBearerToken).toHaveBeenCalledWith("persisted-jwt");
    // Keys rebuilt into the keyring; metadata into state; account made active.
    const restoredKeys = config.keyring.get(account.id);
    expect(restoredKeys).toBeDefined();
    expect(restoredKeys?.s).toBe(account.keyPairs.s);
    expect(config.state.accounts[account.id]?.curvyHandle).toBe(account.curvyHandle);
    expect(config.state.activeAccountId).toBe(account.id);
    // Re-auth was skipped because we had a valid JWT.
    expect(api.auth.GetBearerTotp).not.toHaveBeenCalled();
  });

  it("swallows per-account failures (missing storage metadata) and continues", async () => {
    const api = createFakeApi();
    const storage = new MapStorage();
    const good = fakeCurvyAccount({ keyPairs: { s: "aa".padStart(64, "0") }, curvyHandle: "good.curvy.name" as never });
    await storage.insertCurvyAccount(good.serialize());

    const keystore = fakeKeystore({
      __jwt__: "jwt",
      "missing-metadata-id": JSON.stringify(good.keyPairs), // no storage row -> throws -> skipped
      [good.id]: JSON.stringify(good.keyPairs),
    });

    const config = createFakeConfig({ api, storage });
    (config as { keystore: SessionKeystore | null }).keystore = keystore;

    await restoreSession({ config });

    // The good account still restored; the broken entry was silently skipped.
    expect(config.keyring.has(good.id)).toBe(true);
    expect(config.keyring.has("missing-metadata-id")).toBe(false);
  });
});

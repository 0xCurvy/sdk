import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapStorage } from "@/storage/map-storage";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import type { CurvyId, CurvyKeyPairs, HexString } from "@/types";
import { generateAccountId } from "@/utils/keys";
import { createAndAddAccount } from "./createAndAddAccount";

const ADDRESS = "0x000000000000000000000000000000000000000a" as HexString;
const HANDLE = "alice.curvy.name" as CurvyId;
const CREATED_AT = "2024-01-01T00:00:00.000Z";

const keyPairs: CurvyKeyPairs = {
  s: "11".padStart(64, "0"),
  v: "22".padStart(64, "0"),
  S: "0xSSS",
  V: "0xVVV",
  babyJubjubPublicKey: "11.22",
};

describe("createAndAddAccount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("builds a full account, registers it, and skips re-auth (caller already authenticated)", async () => {
    const api = createFakeApi();
    const config = createFakeConfig({ api, storage: new MapStorage() });

    const account = await createAndAddAccount(config, HANDLE, ADDRESS, CREATED_AT, keyPairs);

    expect(account.curvyHandle).toBe(HANDLE);
    expect(account.ownerAddress).toBe(ADDRESS);
    expect(account.createdAt).toBe(+dayjs(CREATED_AT));
    expect(account.keyPairs).toEqual(keyPairs);

    expect(config.keyring.get(account.id)).toBe(account.keyPairs);
    expect(config.state.activeAccountId).toBe(account.id);
    // addAccount was called with skipBearerTokenUpdate=true, so no auth round trip.
    expect(api.auth.GetBearerTotp).not.toHaveBeenCalled();

    // accountId derivation is unaffected (still derived from s, v for the password hash path).
    await expect(generateAccountId(keyPairs.s, keyPairs.v)).resolves.toEqual(expect.any(String));
  });
});

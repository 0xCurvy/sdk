import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IApiClient } from "@/interfaces/api";
import { MapStorage } from "@/storage/map-storage";
import { createFakeApi, createFakeConfig, createFakeCore } from "@/test/fixtures";
import type { CurvyId, CurvyKeyPairs, HexString } from "@/types";
import { registerAndAddAccount } from "./registerAndAddAccount";

const ADDRESS = "0x000000000000000000000000000000000000000a" as HexString;
const HANDLE = "alice.curvy.name" as CurvyId;

const keyPairs: CurvyKeyPairs = {
  s: "11".padStart(64, "0"),
  v: "22".padStart(64, "0"),
  S: "0xSSS",
  V: "0xVVV",
  babyJubjubPublicKey: "11.22",
};

describe("registerAndAddAccount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("registers the handle, validates it resolved, authenticates, and adds the account", async () => {
    const core = createFakeCore({ getCurvyKeys: vi.fn(async () => keyPairs) });
    const api = createFakeApi();
    api.user.RegisterCurvyId = vi.fn(async () => ({
      data: { message: "ok" },
    })) as unknown as IApiClient["user"]["RegisterCurvyId"];
    api.user.ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "2024-03-03T00:00:00.000Z",
        publicKeys: { viewingKey: "0xVVV", spendingKey: "0xSSS", babyJubjubPublicKey: "11.22" },
      },
    }));
    api.auth.GetBearerTotp = vi.fn(async () => "nonce");
    api.auth.CreateBearerToken = vi.fn(async () => "token");

    const config = createFakeConfig({ core, api, storage: new MapStorage() });

    const account = await registerAndAddAccount(config, { s: keyPairs.s, v: keyPairs.v }, HANDLE, ADDRESS);

    expect(api.user.RegisterCurvyId).toHaveBeenCalledWith({
      handle: HANDLE,
      ownerAddress: ADDRESS,
      publicKeys: { viewingKey: "0xVVV", spendingKey: "0xSSS", babyJubjubPublicKey: "11.22" },
    });
    expect(api.updateBearerToken).toHaveBeenCalledWith("token");
    expect(account.curvyHandle).toBe(HANDLE);
    expect(config.keyring.get(account.id)).toBe(account.keyPairs);
  });

  it("throws when registration validation fails (handle does not resolve afterwards)", async () => {
    const core = createFakeCore({ getCurvyKeys: vi.fn(async () => keyPairs) });
    const api = createFakeApi();
    api.user.RegisterCurvyId = vi.fn(async () => ({
      data: { message: "ok" },
    })) as unknown as IApiClient["user"]["RegisterCurvyId"];
    api.user.ResolveCurvyId = vi.fn(async () => ({ data: null }));

    const config = createFakeConfig({ core, api, storage: new MapStorage() });

    await expect(registerAndAddAccount(config, { s: keyPairs.s, v: keyPairs.v }, HANDLE, ADDRESS)).rejects.toThrow(
      `Registration validation failed for handle ${HANDLE}. Please try adding the account manually.`,
    );
  });
});

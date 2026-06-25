import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import type { CurvyId, CurvyKeyPairs, HexString } from "@/types";
import { preLoginChecks } from "./preLoginChecks";

const ADDRESS = "0x000000000000000000000000000000000000000a" as HexString;
const HANDLE = "alice.curvy.name" as CurvyId;

const keyPairs: CurvyKeyPairs = {
  s: "11".padStart(64, "0"),
  v: "22".padStart(64, "0"),
  S: "0xSSS",
  V: "0xVVV",
  babyJubjubPublicKey: "11.22",
};

describe("preLoginChecks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("validates keys, authenticates, and returns handle + createdAt", async () => {
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => HANDLE);
    api.user.ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "2024-01-01T00:00:00.000Z",
        publicKeys: { viewingKey: "0xVVV", spendingKey: "0xSSS", babyJubjubPublicKey: null },
      },
    }));
    api.auth.GetBearerTotp = vi.fn(async () => "nonce");
    api.auth.CreateBearerToken = vi.fn(async () => "token");
    const config = createFakeConfig({ api });

    const result = await preLoginChecks(config, keyPairs, ADDRESS);

    expect(result).toEqual({ createdAt: "2024-01-01T00:00:00.000Z", curvyHandle: HANDLE });
    expect(api.updateBearerToken).toHaveBeenCalledWith("token");
  });

  it("throws 'Wrong password' when server keys do not match (before authenticating)", async () => {
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => HANDLE);
    api.user.ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "x",
        publicKeys: { viewingKey: "0xMISMATCH", spendingKey: "0xSSS", babyJubjubPublicKey: null },
      },
    }));
    const config = createFakeConfig({ api });

    await expect(preLoginChecks(config, keyPairs, ADDRESS)).rejects.toThrow(`Wrong password for handle ${HANDLE}.`);
    // Auth must NOT have been attempted on a key mismatch.
    expect(api.auth.GetBearerTotp).not.toHaveBeenCalled();
  });
});

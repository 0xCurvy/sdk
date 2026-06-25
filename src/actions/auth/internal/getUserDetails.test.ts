import { describe, expect, it, vi } from "vitest";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import type { CurvyId, HexString } from "@/types";
import { getUserDetails } from "./getUserDetails";

const ADDRESS = "0x000000000000000000000000000000000000000a" as HexString;
const HANDLE = "alice.curvy.name" as CurvyId;

describe("getUserDetails", () => {
  it("returns resolved details merged with the handle", async () => {
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => HANDLE);
    api.user.ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "2024-01-01T00:00:00.000Z",
        publicKeys: { viewingKey: "0xV", spendingKey: "0xS", babyJubjubPublicKey: null },
      },
    }));
    const config = createFakeConfig({ api });

    const details = await getUserDetails(config, ADDRESS);

    expect(details.curvyHandle).toBe(HANDLE);
    expect(details.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(details.publicKeys.spendingKey).toBe("0xS");
  });

  it("throws when no handle is registered for the address", async () => {
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => null);
    const config = createFakeConfig({ api });

    await expect(getUserDetails(config, ADDRESS)).rejects.toThrow(`No Curvy handle found for address: ${ADDRESS}`);
  });

  it("throws when the handle does not resolve", async () => {
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => HANDLE);
    api.user.ResolveCurvyId = vi.fn(async () => ({ data: null }));
    const config = createFakeConfig({ api });

    await expect(getUserDetails(config, ADDRESS)).rejects.toThrow(`Handle ${HANDLE} does not exist.`);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import type { CurvyId, HexString } from "@/types";
import { preRegistrationChecks } from "./preRegistrationChecks";

const ADDRESS = "0x000000000000000000000000000000000000000a" as HexString;
const HANDLE = "alice.curvy.name" as CurvyId;

describe("preRegistrationChecks", () => {
  it("passes for a fresh address + valid + unregistered handle", async () => {
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => null);
    api.user.ResolveCurvyId = vi.fn(async () => ({ data: null }));
    const config = createFakeConfig({ api });

    await expect(preRegistrationChecks(config, HANDLE, ADDRESS)).resolves.toBe(true);
  });

  it("throws when the owner address is already registered", async () => {
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => "taken.curvy.name" as CurvyId);
    const config = createFakeConfig({ api });

    await expect(preRegistrationChecks(config, HANDLE, ADDRESS)).rejects.toThrow(
      `Handle taken.curvy.name already registered, for owner address: ${ADDRESS}`,
    );
  });

  it("throws on an invalid handle format", async () => {
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => null);
    const config = createFakeConfig({ api });

    await expect(preRegistrationChecks(config, "xx" as CurvyId, ADDRESS)).rejects.toThrow(/Invalid handle format/);
  });

  it("throws when the handle is already registered", async () => {
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => null);
    api.user.ResolveCurvyId = vi.fn(async () => ({
      data: { createdAt: "x", publicKeys: { viewingKey: "v", spendingKey: "s", babyJubjubPublicKey: null } },
    }));
    const config = createFakeConfig({ api });

    await expect(preRegistrationChecks(config, HANDLE, ADDRESS)).rejects.toThrow(
      `Handle ${HANDLE} already registered.`,
    );
  });
});

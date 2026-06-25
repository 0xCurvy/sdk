import { parseSignature } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IApiClient } from "@/interfaces/api";
import { MapStorage } from "@/storage/map-storage";
import { createFakeApi, createFakeConfig, createFakeCore } from "@/test/fixtures";
import type { CurvyId, CurvyKeyPairs, EvmSignatureData } from "@/types";
import { getSignatureParams } from "@/utils/eip712/getSignatureParams";
import { computePrivateKeys } from "@/utils/keys";
import { register } from "./register";

const PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const HANDLE = "alice.curvy.name" as CurvyId;

async function buildSignature() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const signatureParams = getSignatureParams("register");
  // getSignatureParams `satisfies` the SDK's own typed-data param type; cast at
  // the viem boundary, whose stricter generic inference rejects the non-`as
  // const` `type` fields.
  const signatureResult = await account.signTypedData(
    signatureParams as unknown as Parameters<typeof account.signTypedData>[0],
  );
  const signature: EvmSignatureData = {
    signingAddress: account.address,
    signatureParams,
    signatureResult,
  };
  const { r, s } = parseSignature(signatureResult);
  return { signature, account, derived: computePrivateKeys(r, s) };
}

describe("register (happy path)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("runs pre-registration checks, registers the handle, authenticates, and adds the account", async () => {
    const { signature, account: signer, derived } = await buildSignature();

    const keyPairs: CurvyKeyPairs = {
      s: derived.s,
      v: derived.v,
      S: "0xSSS",
      V: "0xVVV",
      babyJubjubPublicKey: "11.22",
    };
    const core = createFakeCore({ getCurvyKeys: vi.fn(async () => keyPairs) });

    const api = createFakeApi();
    // Owner address has no handle yet.
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => null);
    // First ResolveCurvyId (pre-registration) -> not registered; second (post-register) -> resolved.
    api.user.ResolveCurvyId = vi
      .fn()
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({
        data: {
          createdAt: "2024-02-02T00:00:00.000Z",
          publicKeys: { viewingKey: "0xVVV", spendingKey: "0xSSS", babyJubjubPublicKey: "11.22" },
        },
      });
    api.user.RegisterCurvyId = vi.fn(async () => ({
      data: { message: "ok" },
    })) as unknown as IApiClient["user"]["RegisterCurvyId"];
    api.auth.GetBearerTotp = vi.fn(async () => "nonce");
    api.auth.CreateBearerToken = vi.fn(async () => "token");

    const config = createFakeConfig({ core, api, storage: new MapStorage() });

    const account = await register({ config, handle: HANDLE, signature });

    expect(api.user.GetCurvyIdByOwnerAddress).toHaveBeenCalledWith(signer.address);
    expect(api.user.RegisterCurvyId).toHaveBeenCalledWith({
      handle: HANDLE,
      ownerAddress: signer.address,
      publicKeys: { viewingKey: "0xVVV", spendingKey: "0xSSS", babyJubjubPublicKey: "11.22" },
    });
    expect(api.user.ResolveCurvyId).toHaveBeenCalledTimes(2);
    expect(api.updateBearerToken).toHaveBeenCalledWith("token");

    expect(account.isPartial).toBe(false);
    expect(account.curvyHandle).toBe(HANDLE);
    expect(account.ownerAddress).toBe(signer.address);
    expect(config.keyring.get(account.id)).toBe(account.keyPairs);
    expect(config.state.activeAccountId).toBe(account.id);
  });

  it("throws when the owner address already has a handle", async () => {
    const { signature } = await buildSignature();
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => "taken.curvy.name" as CurvyId);

    const config = createFakeConfig({ api, storage: new MapStorage() });

    await expect(register({ config, handle: HANDLE, signature })).rejects.toThrow(/already registered/);
  });

  it("throws on an invalid handle format", async () => {
    const { signature } = await buildSignature();
    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => null);

    const config = createFakeConfig({ api, storage: new MapStorage() });

    await expect(register({ config, handle: "ab" as CurvyId, signature })).rejects.toThrow(/Invalid handle format/);
  });
});

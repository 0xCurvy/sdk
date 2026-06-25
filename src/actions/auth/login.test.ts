import { privateKeyToAccount } from "viem/accounts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapStorage } from "@/storage/map-storage";
import { createFakeApi, createFakeConfig, createFakeCore } from "@/test/fixtures";
import type { CurvyId, CurvyKeyPairs, EvmSignatureData } from "@/types";
import { getSignatureParams } from "@/utils/eip712/getSignatureParams";
import { computePrivateKeys } from "@/utils/keys";
import { login } from "./login";

const PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const HANDLE = "alice.curvy.name" as CurvyId;

/** Build a real EVM signature so `verifyEvmSignature` -> computePrivateKeys produce real s/v. */
async function buildSignature() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const signatureParams = getSignatureParams("login");
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
  // Recover the same r/s the action will derive, so we can align the fakes.
  const { parseSignature } = await import("viem");
  const { r, s } = parseSignature(signatureResult);
  const keys = computePrivateKeys(r, s);
  return { signature, account, derived: keys };
}

describe("login (happy path)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("verifies the signature, validates server keys, authenticates, and adds the account", async () => {
    const { signature, account: signer, derived } = await buildSignature();

    // Curvy keys the fake core returns for the derived (s, v).
    const keyPairs: CurvyKeyPairs = {
      s: derived.s,
      v: derived.v,
      S: "0xSSS",
      V: "0xVVV",
      babyJubjubPublicKey: "11.22",
    };

    const core = createFakeCore({ getCurvyKeys: vi.fn(async () => keyPairs) });

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

    const config = createFakeConfig({ core, api, storage: new MapStorage() });

    const account = await login({ config, signature });

    // Returned a fully-formed (non-partial) account.
    expect(account.isPartial).toBe(false);
    expect(account.curvyHandle).toBe(HANDLE);
    expect(account.ownerAddress).toBe(signer.address);
    expect(account.keyPairs.s).toBe(derived.s);

    // Server lookups happened with the right inputs.
    expect(api.user.GetCurvyIdByOwnerAddress).toHaveBeenCalledWith(signer.address);
    expect(api.user.ResolveCurvyId).toHaveBeenCalledWith(HANDLE);

    // Authenticated and registered.
    expect(api.updateBearerToken).toHaveBeenCalledWith("token");
    expect(config.keyring.get(account.id)).toBe(account.keyPairs);
    expect(config.state.activeAccountId).toBe(account.id);
    expect(config.state.accounts[account.id]?.curvyHandle).toBe(HANDLE);
  });

  it("throws 'Wrong password' when the server keys do not match the derived keys", async () => {
    const { signature, derived } = await buildSignature();
    const keyPairs: CurvyKeyPairs = {
      s: derived.s,
      v: derived.v,
      S: "0xSSS",
      V: "0xVVV",
      babyJubjubPublicKey: "11.22",
    };
    const core = createFakeCore({ getCurvyKeys: vi.fn(async () => keyPairs) });

    const api = createFakeApi();
    api.user.GetCurvyIdByOwnerAddress = vi.fn(async () => HANDLE);
    api.user.ResolveCurvyId = vi.fn(async () => ({
      data: {
        createdAt: "2024-01-01T00:00:00.000Z",
        publicKeys: { viewingKey: "0xDIFFERENT", spendingKey: "0xSSS", babyJubjubPublicKey: null },
      },
    }));

    const config = createFakeConfig({ core, api, storage: new MapStorage() });

    await expect(login({ config, signature })).rejects.toThrow(`Wrong password for handle ${HANDLE}.`);
  });
});

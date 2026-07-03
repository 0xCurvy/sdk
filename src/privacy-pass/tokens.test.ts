import { constants, createHash, generateKeyPairSync, privateDecrypt, webcrypto } from "node:crypto";
import {
  AuthorizationHeader,
  genericBatched,
  publicVerif,
  TOKEN_TYPES,
  TokenChallenge,
} from "@cloudflare/privacypass-ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapStorage } from "@/storage/map-storage";
import { createFakeApi, createFakeConfig } from "@/test/fixtures";
import { popPrivateToken } from "./tokens";

const { BlindRSAMode, Origin, TokenResponse, convertEncToRSASSAPSS } = publicVerif;

/**
 * A real issuer + redeemer living inside the fake API: challenges, directory,
 * and blind signatures are all genuine crypto (node:crypto raw RSA — same path
 * as the metadata service), so this exercises the client pipeline end-to-end:
 * bootstrap → blind → batched issuance → finalize → stockpile → pop → verify.
 */
async function createHarness(mode: "off" | "shadow" | "enforce" = "enforce") {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, publicExponent: 0x10001 });
  const spkiEnc = publicKey.export({ type: "spki", format: "der" });
  const spkiRsaPss = convertEncToRSASSAPSS(new Uint8Array(spkiEnc));
  const verifyKey = await webcrypto.subtle.importKey("spki", spkiEnc, { name: "RSA-PSS", hash: "SHA-384" }, false, [
    "verify",
  ]);

  const challenge = new TokenChallenge(TOKEN_TYPES.BLIND_RSA.value, "issuer.curvy.test", new Uint8Array(0), [
    "relayer.curvy.test",
  ]);
  const challengeB64 = Buffer.from(challenge.serialize()).toString("base64url");
  const tokenKeyB64 = Buffer.from(spkiRsaPss).toString("base64url");

  const issuedCounts: number[] = [];
  const requestTokens = vi.fn(async (batchBytes: Uint8Array) => {
    const batch = genericBatched.BatchedTokenRequest.deserialize(batchBytes);
    issuedCounts.push(batch.tokenRequests.length);
    const responses = batch.tokenRequests.map((wrapped) => {
      const signature = privateDecrypt(
        { key: privateKey, padding: constants.RSA_NO_PADDING },
        Buffer.from(wrapped.blindMsg),
      );
      return new genericBatched.OptionalTokenResponse(new TokenResponse(new Uint8Array(signature)));
    });
    return new genericBatched.GenericBatchTokenResponse(responses).serialize();
  });

  const getChallenge = vi.fn(async () => ({
    mode,
    challenge: challengeB64,
    "token-key": tokenKeyB64,
    "issuer-directory": "http://metadata.test/.well-known/private-token-issuer-directory",
  }));

  const api = createFakeApi({
    privacyPass: {
      GetChallenge: getChallenge,
      GetIssuerDirectory: vi.fn(async () => ({
        "issuer-request-uri": "http://metadata.test/token-request",
        "token-keys": [{ "token-type": 2, "token-key": tokenKeyB64 }],
      })),
      RequestTokens: requestTokens,
    },
  });
  // Issuance is identity-bound: the manager refuses to refill without a JWT.
  Object.defineProperty(api, "bearerToken", { get: () => "test-jwt" });

  const storage = new MapStorage();
  const config = createFakeConfig({ api, storage });
  const origin = new Origin(BlindRSAMode.PSS, ["relayer.curvy.test"]);

  return { config, storage, origin, verifyKey, challenge, requestTokens, getChallenge, issuedCounts };
}

describe("popPrivateToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("bootstraps, refills once, and returns a token that verifies against the issuer key", async () => {
    const h = await createHarness();
    const header = await popPrivateToken(h.config, "relayer");

    expect(header).toMatch(/^PrivateToken token=/);
    const [parsed] = AuthorizationHeader.parse(TOKEN_TYPES.BLIND_RSA, header as string);
    expect(await h.origin.verify(parsed.token, h.verifyKey)).toBe(true);

    // Token is bound to the redeemer's challenge digest.
    const digest = createHash("sha256").update(h.challenge.serialize()).digest();
    expect(Buffer.from(parsed.token.authInput.challengeDigest)).toEqual(digest);
  });

  it("stockpiles a batch and pops distinct tokens without re-issuing", async () => {
    const h = await createHarness();

    const first = await popPrivateToken(h.config, "relayer");
    const second = await popPrivateToken(h.config, "relayer");

    expect(first).not.toEqual(second);
    // One batched issuance served both pops.
    expect(h.requestTokens).toHaveBeenCalledTimes(1);
    expect(h.issuedCounts[0]).toBeGreaterThanOrEqual(2);
  });

  it("returns undefined when the redeemer reports mode off (no tokens minted)", async () => {
    const h = await createHarness("off");
    expect(await popPrivateToken(h.config, "relayer")).toBeUndefined();
    expect(h.requestTokens).not.toHaveBeenCalled();
  });

  it("returns undefined without a bearer token (issuance is identity-bound)", async () => {
    const h = await createHarness();
    Object.defineProperty(h.config.api, "bearerToken", { get: () => undefined });
    expect(await popPrivateToken(h.config, "relayer")).toBeUndefined();
  });

  it("returns undefined (tokenless) when the challenge bootstrap fails", async () => {
    const h = await createHarness();
    h.getChallenge.mockRejectedValue(new Error("redeemer down"));
    expect(await popPrivateToken(h.config, "relayer")).toBeUndefined();
  });

  it("forceRefresh re-fetches the challenge and pops from the new scope", async () => {
    const h = await createHarness();
    const first = await popPrivateToken(h.config, "relayer");
    const second = await popPrivateToken(h.config, "relayer", { forceRefresh: true });
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(h.getChallenge.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

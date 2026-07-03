import { genericBatched, publicVerif, TokenChallenge } from "@cloudflare/privacypass-ts";
import type { CurvyConfig } from "@/config/types";
import type { PrivacyPassChallengeInfo } from "@/types/api";

const { BlindRSAMode, Client, TokenResponse } = publicVerif;

/**
 * Privacy Pass client lifecycle (token type 0x0002, blind RSA):
 *
 *   1. bootstrap — fetch the redeemer's challenge (`GET <svc>/token-challenge`)
 *   2. refill    — blind N token requests, batch-POST them to metadata's
 *                  `/token-request` (bearer JWT = the ONLY identity-bound step),
 *                  finalize, stockpile in the storage pouch
 *   3. spend     — pop one single-use token per gated request
 *
 * Blinding makes a spent token statistically independent of anything the
 * issuer saw, so redemptions are unlinkable to the handle and to each other.
 */

// Only the relayer is token-gated. The indexer's /rpc proxy is deliberately
// tokenless (method allowlist + infra rate limits guard it): RPC reads carry
// no identity either way, and their volume would drain the daily budget.
export type PrivacyPassService = "relayer";

interface PpScope {
  service: PrivacyPassService;
  mode: PrivacyPassChallengeInfo["mode"];
  /** b64url(padded) serialized challenge — tokens are bound to its digest. */
  challengeB64: string;
  /** Storage pouch key: service + challenge, so a challenge change starts a fresh pouch. */
  pouchKey: string;
  fetchedAt: number;
}

/** Internal per-config state, held on `config._internal.privacyPass`. */
export interface PrivacyPassInternalState {
  scopes: Map<string, PpScope>;
  /** Single-flight refills per pouch key. */
  refills: Map<string, Promise<boolean>>;
}

/** Tokens minted per issuance round-trip (one batched POST). */
const REFILL_BATCH = 20;
/** Opportunistic background top-up threshold. */
const LOW_WATER = 5;
/** Challenge info cache lifetime. */
const SCOPE_TTL_MS = 5 * 60_000;

function b64urlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(base64.replace(/=+$/, ""));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bytesToB64url(bytes: Uint8Array): string {
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  const base64 = btoa(raw).replaceAll("+", "-").replaceAll("/", "_");
  return base64 + "=".repeat((4 - (base64.length % 4)) % 4);
}

function internalState(config: CurvyConfig): PrivacyPassInternalState {
  let state = config._internal.privacyPass;
  if (!state) {
    state = { scopes: new Map(), refills: new Map() };
    config._internal.privacyPass = state;
  }
  return state;
}

/** Fetch (or serve cached) redeemer challenge info. Null when unavailable — callers go tokenless. */
async function getScope(
  config: CurvyConfig,
  service: PrivacyPassService,
  opts: { forceRefresh?: boolean } = {},
): Promise<PpScope | null> {
  const state = internalState(config);
  const cached = state.scopes.get(service);
  if (cached && !opts.forceRefresh && Date.now() - cached.fetchedAt < SCOPE_TTL_MS) return cached;

  try {
    const info = await config.api.privacyPass.GetChallenge(service);
    const scope: PpScope = {
      service,
      mode: info.mode,
      challengeB64: info.challenge,
      pouchKey: `pp:${service}:${info.challenge}`,
      fetchedAt: Date.now(),
    };
    state.scopes.set(service, scope);
    return scope;
  } catch {
    // Redeemer unreachable or predates Privacy Pass — proceed tokenless. An
    // enforcing redeemer will 401 and the submit path retries with a fresh scope.
    return cached ?? null;
  }
}

/**
 * Mint `count` tokens for `scope` and stockpile them. Single-flighted per
 * pouch; resolves false when issuance is impossible (not logged in, quota
 * exhausted, issuer unreachable).
 */
async function refill(config: CurvyConfig, scope: PpScope, count = REFILL_BATCH): Promise<boolean> {
  const state = internalState(config);
  const inflight = state.refills.get(scope.pouchKey);
  if (inflight) return inflight;

  const run = (async () => {
    // Issuance is the identity-bound step: without the login JWT the issuer
    // cannot attest quota, so there is nothing to do.
    if (!config.api.bearerToken) return false;

    try {
      const challenge = TokenChallenge.deserialize(b64urlToBytes(scope.challengeB64));
      const directory = await config.api.privacyPass.GetIssuerDirectory();
      const issuerKey = directory["token-keys"].find((k) => k["token-type"] === 2)?.["token-key"];
      if (!issuerKey) return false;
      const issuerPublicKey = b64urlToBytes(issuerKey);

      // One Client per token — finalize state is per-instance.
      const clients = Array.from({ length: count }, () => new Client(BlindRSAMode.PSS));
      const requests = [];
      for (const client of clients) {
        requests.push(await client.createTokenRequest(challenge, issuerPublicKey));
      }
      const batch = new genericBatched.Client().createTokenRequest(
        requests.map((r) => new genericBatched.TokenRequest(r)),
      );

      const responseBytes = await config.api.privacyPass.RequestTokens(batch.serialize());
      const responses = genericBatched.GenericBatchTokenResponse.deserialize(responseBytes);

      const tokens: string[] = [];
      let index = 0;
      for (const optional of responses) {
        const tokenResponse = optional.tokenResponse;
        if (tokenResponse instanceof TokenResponse) {
          const token = await clients[index].finalize(tokenResponse);
          tokens.push(bytesToB64url(token.serialize()));
        }
        index++;
      }
      if (tokens.length === 0) return false;
      await config.storage.appendPrivateTokens(scope.pouchKey, tokens);
      return true;
    } catch {
      // Quota exhausted (429), auth expired (401), network error: all mean "no
      // tokens right now". Gated requests then go tokenless and surface the
      // redeemer's own response.
      return false;
    }
  })();

  state.refills.set(scope.pouchKey, run);
  try {
    return await run;
  } finally {
    state.refills.delete(scope.pouchKey);
  }
}

/**
 * Pop one single-use token for a gated request, refilling when empty. Returns
 * the `Authorization` header value, or undefined when tokens are off/unavailable
 * (callers send the request tokenless and let the redeemer decide).
 */
export async function popPrivateToken(
  config: CurvyConfig,
  service: PrivacyPassService,
  opts: { forceRefresh?: boolean } = {},
): Promise<string | undefined> {
  const scope = await getScope(config, service, opts);
  if (!scope || scope.mode === "off") return undefined;

  let token = await config.storage.takePrivateToken(scope.pouchKey);
  if (!token) {
    if (!(await refill(config, scope))) return undefined;
    token = await config.storage.takePrivateToken(scope.pouchKey);
    if (!token) return undefined;
  }

  // Fire-and-forget top-up so the NEXT spend never blocks on issuance.
  void config.storage
    .countPrivateTokens(scope.pouchKey)
    .then((remaining) => {
      if (remaining < LOW_WATER) return refill(config, scope).then(() => undefined);
    })
    .catch(() => undefined);

  return `PrivateToken token=${token}`;
}

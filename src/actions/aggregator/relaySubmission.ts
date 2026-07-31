import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { APIError, RelayError } from "@/errors";
import { popPrivateToken } from "@/privacy-pass/tokens";
import type { RelayProofPayload, RelaySubmitRequestBody, RelaySubmitReturnType } from "@/types/aggregator";
import { deriveRelayRequestKey, deriveRelaySpendKey } from "@/utils/aggregator";
import type { AggregatorSubmission } from "./types";

export type RelaySubmissionParameters = WithConfig<{
  /** A built submission from one of the `build*Request` actions. */
  request: AggregatorSubmission;
  intentId?: string;
}>;

/**
 * Relay a built proof via the SDK's relay service — no EVM wallet, no gas. The
 * proof self-authenticates (the on-chain verifier is the gate), so the relay is
 * anonymous. Returns IMMEDIATELY with `{ requestId, status: "queued" }`; poll to
 * finality with {@link waitForRelay}.
 *
 * The wire contract is SDK-owned (see {@link RelaySubmitRequestBody}); nothing here
 * couples to a specific backend, so a backend rewrite cannot break it.
 */
export async function relaySubmission(parameters: RelaySubmissionParameters): Promise<RelaySubmitReturnType> {
  const { request } = parameters;
  const config = resolveConfig(parameters.config);

  const network = config.state.networks.find((n) => n.slug === request.networkSlug);
  if (!network) throw new RelayError(`relaySubmission: unknown network "${request.networkSlug}"`);

  const { proofA, proofB, proofC } = request.proof;
  const proof: RelayProofPayload = {
    a: [proofA[0].toString(), proofA[1].toString()],
    b: [
      [proofB[0][0].toString(), proofB[0][1].toString()],
      [proofB[1][0].toString(), proofB[1][1].toString()],
    ],
    c: [proofC[0].toString(), proofC[1].toString()],
  };

  const keyMaterial = {
    action: request.action,
    // Relayer is chain-keyed (one signer per EVM chain); send the on-chain chainId,
    // not the indexer's internal network row id.
    networkId: Number(network.chainId),
    maxInputs: request.contractArg,
    proof,
    publicSignals: request.publicSignals.map((s) => s.toString()),
  } satisfies Omit<RelaySubmitRequestBody, "requestKey" | "spendKey" | "intentId">;
  const body: RelaySubmitRequestBody = {
    ...keyMaterial,
    requestKey: deriveRelayRequestKey(keyMaterial),
    spendKey: deriveRelaySpendKey(keyMaterial),
    intentId: parameters.intentId,
  };

  // Privacy Pass: attach a single-use anonymous token (the relayer's rate-limit
  // credential). `undefined` (tokens off / unavailable) submits tokenless — a
  // shadow-mode relayer accepts that; an enforcing one 401s and we retry once
  // with a freshly-bootstrapped scope + token.
  const privateToken = await popPrivateToken(config, "relayer");

  try {
    return await config.api.relay.SubmitProof(body, privateToken);
  } catch (error) {
    let failure = error as Error;
    if (isPrivacyPassRejection(error)) {
      const retryToken = await popPrivateToken(config, "relayer", { forceRefresh: true });
      if (retryToken && retryToken !== privateToken) {
        try {
          // Safe to retry: requestKey dedupes if the first POST DID land.
          return await config.api.relay.SubmitProof(body, retryToken);
        } catch (retryError) {
          failure = retryError as Error;
        }
      }
    }
    if (parameters.intentId) {
      try {
        const recovered = await config.api.relay.GetSubmissionByIntent(parameters.intentId, Number(network.chainId));
        if (recovered?.requestId) return recovered;
      } catch {
        // The persisted intent/attempt remains locked and can retry this lookup on sync.
      }
    }
    throw new RelayError(`relaySubmission failed: ${failure.message}`, failure);
  }
}

function isPrivacyPassRejection(error: unknown): error is APIError {
  if (!(error instanceof APIError)) return false;
  if (error.statusCode === 401) return true;
  return (
    error.statusCode === 409 &&
    typeof error.responseBody === "string" &&
    error.responseBody.includes("Token already spent")
  );
}

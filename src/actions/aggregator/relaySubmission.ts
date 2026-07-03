import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { APIError, RelayError } from "@/errors";
import { popPrivateToken } from "@/privacy-pass/tokens";
import type { RelayProofPayload, RelaySubmitRequestBody, RelaySubmitReturnType } from "@/types/aggregator";
import type { AggregatorSubmission } from "./types";

export type RelaySubmissionParameters = WithConfig<{
  /** A built submission from one of the `build*Request` actions. */
  request: AggregatorSubmission;
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

  // Derive the idempotency key from the first nullifier (unique per spend) so a
  // POST retry maps to the SAME relayed tx instead of double-submitting.
  const dedupe = (request.nullifiers?.[0] ?? request.publicSignals[0] ?? 0n).toString();

  const body: RelaySubmitRequestBody = {
    action: request.action,
    // Relayer is chain-keyed (one signer per EVM chain); send the on-chain chainId,
    // not the indexer's internal network row id.
    networkId: Number(network.chainId),
    maxInputs: request.contractArg,
    proof,
    publicSignals: request.publicSignals.map((s) => s.toString()),
    idempotencyKey: `${request.action}:${dedupe}`,
  };

  // Privacy Pass: attach a single-use anonymous token (the relayer's rate-limit
  // credential). `undefined` (tokens off / unavailable) submits tokenless — a
  // shadow-mode relayer accepts that; an enforcing one 401s and we retry once
  // with a freshly-bootstrapped scope + token.
  const privateToken = await popPrivateToken(config, "relayer");

  try {
    return await config.api.relay.SubmitProof(body, privateToken);
  } catch (error) {
    const status = error instanceof APIError ? error.statusCode : undefined;
    if (status === 401 || status === 409) {
      const retryToken = await popPrivateToken(config, "relayer", { forceRefresh: true });
      if (retryToken && retryToken !== privateToken) {
        try {
          // Safe to retry: idempotencyKey dedupes if the first POST DID land.
          return await config.api.relay.SubmitProof(body, retryToken);
        } catch (retryError) {
          throw new RelayError(`relaySubmission failed: ${(retryError as Error).message}`, retryError as Error);
        }
      }
    }
    throw new RelayError(`relaySubmission failed: ${(error as Error).message}`, error as Error);
  }
}

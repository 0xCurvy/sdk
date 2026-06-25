import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { RelaySubmitReturnType } from "@/types/aggregator";
import { pollForCriteria } from "@/utils/promise";

export type WaitForRelayParameters = WithConfig<{
  /** The `requestId` returned by `relaySubmission`. */
  requestId: string;
  /** Poll interval in milliseconds (default 3000). */
  intervalMs?: number;
  /** Maximum poll attempts before giving up (default 120). */
  attempts?: number;
}>;

/**
 * Poll a relayed submission until it reaches a terminal state (`finalized` or
 * `failed`). Pair with {@link relaySubmission}, which returns immediately while the
 * relayer works — `waitForRelay` is the explicit "await to finality" step.
 */
export async function waitForRelay(parameters: WaitForRelayParameters): Promise<RelaySubmitReturnType> {
  const config = resolveConfig(parameters.config);
  return pollForCriteria(
    () => config.api.relay.GetSubmissionStatus(parameters.requestId),
    (res) => res.status === "finalized" || res.status === "failed",
    parameters.attempts ?? 120,
    parameters.intervalMs ?? 3000,
    // Keep polling through transient errors (network reset, 5xx, timeout): the
    // relayer runs async for minutes, so a single blip must not surface a spurious
    // "failed" wait for a submission that finalizes on-chain. The attempts cap
    // above still bounds the loop.
    () => true,
  );
}

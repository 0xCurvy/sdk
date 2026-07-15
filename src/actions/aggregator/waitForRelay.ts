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
  /** Milestone to wait for; defaults to canonical inclusion. */
  waitFor?: "submitted" | "included" | "finalized";
}>;

/**
 * Poll a relayed submission to the requested lifecycle milestone. A receipt is
 * not finality; the default returns once the exact inclusion block is canonical.
 */
export async function waitForRelay(parameters: WaitForRelayParameters): Promise<RelaySubmitReturnType> {
  const config = resolveConfig(parameters.config);
  const waitFor = parameters.waitFor ?? "included";
  const rank = { queued: 0, submitting: 1, submitted: 2, included: 3, finalized: 4 } as const;
  return pollForCriteria(
    () => config.api.relay.GetSubmissionStatus(parameters.requestId),
    (res) =>
      res.status === "failed" ||
      res.status === "needs_rebuild" ||
      (res.status !== "reorged" && rank[res.status] >= rank[waitFor]),
    parameters.attempts ?? 120,
    parameters.intervalMs ?? 3000,
    // Keep polling through transient errors (network reset, 5xx, timeout): the
    // relayer runs async for minutes, so a single blip must not surface a spurious
    // "failed" wait for a submission that finalizes on-chain. The attempts cap
    // above still bounds the loop.
    () => true,
  );
}

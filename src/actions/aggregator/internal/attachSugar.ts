import type { WalletClient } from "viem";
import type { CurvyConfig } from "@/config/types";
import type { HexString } from "@/types/helper";
import { relaySubmission } from "../relaySubmission";
import { submitToChain } from "../submitToChain";
import type { AggregatorSubmission, SubmittableSubmission } from "../types";

/**
 * Attach the `submit` / `relay` chaining sugar to a built submission.
 *
 * The methods are NON-ENUMERABLE closures over the sibling free actions, so the
 * submission stays serializable data: `JSON.stringify` / `structuredClone` / worker
 * `postMessage` all round-trip the data and simply drop the methods. A consumer who
 * wants `await req.submit({ walletClient })` gets it; one who persists/transfers the
 * proof gets a clean `AggregatorSubmission` (and uses the free actions to send it).
 */
export function attachSubmissionSugar(config: CurvyConfig, submission: AggregatorSubmission): SubmittableSubmission {
  Object.defineProperty(submission, "submit", {
    enumerable: false,
    value: (opts: { walletClient: WalletClient; contractAddress?: HexString }) =>
      submitToChain({ config, request: submission, ...opts }),
  });
  Object.defineProperty(submission, "relay", {
    enumerable: false,
    value: () => relaySubmission({ config, request: submission }),
  });
  return submission as SubmittableSubmission;
}

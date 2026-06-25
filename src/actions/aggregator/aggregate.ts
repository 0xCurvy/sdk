import { resolveConfig } from "@/config/global";
import type { RelaySubmitReturnType } from "@/types/aggregator";
import { type BuildAggregateRequestParameters, buildAggregateRequest } from "./buildAggregateRequest";
import { relaySubmission } from "./relaySubmission";
import { submitToChain } from "./submitToChain";
import type { ChainSubmitResult, SubmitVia } from "./types";

export type AggregateParameters = BuildAggregateRequestParameters & {
  /** Where to send the built proof: `{ kind: "wallet", walletClient }` or `{ kind: "relay" }`. */
  via: SubmitVia;
};

/**
 * One-call AGGREGATE: build the proof from committed notes and send it in one shot,
 * either via the user's wallet (`via.kind === "wallet"`) or the relay service
 * (`via.kind === "relay"`). The two-step `buildAggregateRequest` + `.submit()`/`.relay()`
 * is available when you want to inspect the proof first.
 *
 * @example
 * const { receipt } = await aggregate({ inputNotes, ownerBjjPrivateKeyHex,
 *   recipients: [{ amount: 5n, curvyId: "alice.curvy.name" }],
 *   protocolFeePerThousand: 3n, gasFee: 0n, via: { kind: "wallet", walletClient } });
 */
export async function aggregate(parameters: AggregateParameters): Promise<ChainSubmitResult | RelaySubmitReturnType> {
  const { via, ...build } = parameters;
  const config = resolveConfig(parameters.config);
  const request = await buildAggregateRequest(build);
  return via.kind === "wallet"
    ? submitToChain({ config, request, walletClient: via.walletClient, contractAddress: via.contractAddress })
    : relaySubmission({ config, request });
}

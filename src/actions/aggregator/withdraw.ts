import { resolveConfig } from "@/config/global";
import type { RelaySubmitReturnType } from "@/types/aggregator";
import { type BuildWithdrawRequestParameters, buildWithdrawRequest } from "./buildWithdrawRequest";
import { relaySubmission } from "./relaySubmission";
import { submitToChain } from "./submitToChain";
import type { ChainSubmitResult, SubmitVia } from "./types";

export type WithdrawParameters = BuildWithdrawRequestParameters & {
  /** Where to send the built proof: `{ kind: "wallet", walletClient }` or `{ kind: "relay" }`. */
  via: SubmitVia;
};

/**
 * One-call WITHDRAW: build the proof from committed notes and send it in one shot,
 * via the user's wallet or the relay service. Use `buildWithdrawRequest` + the
 * `.submit()`/`.relay()` sugar when you want the proof object first.
 *
 * @example
 * const { receipt } = await withdraw({ notes, ownerBjjPrivateKeyHex,
 *   destinationAddress, tokenId: 1n, via: { kind: "wallet", walletClient } });
 */
export async function withdraw(parameters: WithdrawParameters): Promise<ChainSubmitResult | RelaySubmitReturnType> {
  const { via, ...build } = parameters;
  const config = resolveConfig(parameters.config);
  const request = await buildWithdrawRequest(build);
  return via.kind === "wallet"
    ? submitToChain({ config, request, walletClient: via.walletClient, contractAddress: via.contractAddress })
    : relaySubmission({ config, request });
}

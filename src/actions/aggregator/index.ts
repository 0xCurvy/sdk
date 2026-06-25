// Aggregator DX: build a submit-ready proof, then submit it with the user's wallet
// or relay it via the SDK's service.
//
//   const req = await buildAggregateRequest({ ... });   // plain serializable data
//   await req.submit({ walletClient });                 // user submits (pays gas)
//   await req.relay();                                  // our service submits
//
//   await aggregate({ ..., via: { kind: "wallet", walletClient } });  // one-call
export * from "./aggregate";
export * from "./buildAggregateRequest";
export * from "./buildWithdrawRequest";
// Operator-paymaster cost estimation (submit-aggregation gas, commit gas, protocol
// fee) — all in the aggregation token; also sizes the gas-reimbursement note.
export {
  type AggregationCostEstimate,
  estimateAggregationCosts,
} from "./internal/estimateAggregationCosts";
export * from "./relaySubmission";
export * from "./submitToChain";
export * from "./types";
export * from "./waitForRelay";
export * from "./withdraw";

// Conservative default gas-unit baselines for the aggregator entry points.
//
// These are FALLBACKS only. The relayer measures the real cost per request with
// `estimateContractGas` on the actual call and serves its current view via
// `GET /relay/paymaster`; the SDK prefers those numbers and falls back to these
// constants when the endpoint is unavailable. They are intentionally generous —
// the operator-note client buffer is sized on top — because under-estimating here
// only risks a relayer refusal (then a rebuild), never a fund loss.
//
// Observed (devenv, maxInputs=2): submit ≈ 618k base / 773k folded, commit batch
// dominated by the groth16 verifier MSM (~618k). Rounded up for headroom.

/** Default gas units for `submitAggregationRequest`. */
export const DEFAULT_SUBMIT_AGGREGATION_GAS_UNITS = 900_000n;

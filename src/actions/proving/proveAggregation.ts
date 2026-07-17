import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { AggregationCircuitInputs } from "@/proving/circuitInputs";
import type { ProofResult } from "@/proving/prover";
import { flattenAggregationCircuitInputs } from "@/proving/witnessFromNotes";
import { loadArtifactsAndProve } from "./internal/loadArtifactsAndProve";
import { resolveCircuitArtifacts } from "./internal/resolveCircuitArtifacts";

export type ProveAggregationParameters = WithConfig<{
  /**
   * The aggregation witness from `generateAggregationCircuitInputsFromNotes`.
   * Input generation stays separate; this action only flattens + proves.
   */
  witness: AggregationCircuitInputs;
  /** Network whose deployed aggregation circuit to prove against; defaults to the active network. */
  networkSlug?: string;
}>;

/**
 * Prove an aggregation: resolve the network's aggregation circuit artifacts
 * (from its `CircuitConfig`), flatten the supplied witness, and run it through
 * the config's `prover` (default Rust/arkworks). Returns the Groth16 proof + public
 * signals, ready for the operator's on-chain submit.
 *
 * @example
 * const witness = await generateAggregationCircuitInputsFromNotes({ inputNotes, ... });
 * const { proof, publicSignals } = await proveAggregation({ witness });
 */
export async function proveAggregation(parameters: ProveAggregationParameters): Promise<ProofResult> {
  const config = resolveConfig(parameters.config);
  const artifacts = resolveCircuitArtifacts(config, "aggregation", parameters.networkSlug);
  return loadArtifactsAndProve(config, artifacts, flattenAggregationCircuitInputs(parameters.witness));
}

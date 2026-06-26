import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { WithdrawCircuitInputs } from "@/proving/circuitInputs";
import { loadCircuitKey } from "@/proving/circuitKeyCache";
import type { ProofResult } from "@/proving/prover";
import { flattenWithdrawalCircuitInputs } from "@/proving/witnessFromNotes";
import { resolveCircuitArtifacts } from "./internal/resolveCircuitArtifacts";

export type ProveWithdrawalParameters = WithConfig<{
  /**
   * The withdrawal witness from `generateWithdrawalCircuitInputsFromNotes`.
   * Input generation stays separate; this action only flattens + proves.
   */
  witness: WithdrawCircuitInputs;
  /** Network whose deployed withdrawal circuit to prove against; defaults to the active network. */
  networkSlug?: string;
}>;

/**
 * Prove a withdrawal: resolve the network's withdrawal circuit artifacts (from
 * its `CircuitConfig`), flatten the supplied witness, and run it through the
 * config's `prover` (default snarkjs). Returns the Groth16 proof + public
 * signals, ready for the operator's on-chain submit.
 *
 * @example
 * const witness = await generateWithdrawalCircuitInputsFromNotes({ notes, ... });
 * const { proof, publicSignals } = await proveWithdrawal({ witness });
 */
export async function proveWithdrawal(parameters: ProveWithdrawalParameters): Promise<ProofResult> {
  const config = resolveConfig(parameters.config);
  const { wasm, zkey } = resolveCircuitArtifacts(config, "withdrawal", parameters.networkSlug);
  const [wasmArtifact, zkeyArtifact] = await Promise.all([
    loadCircuitKey(config.circuitKeyCache, wasm),
    loadCircuitKey(config.circuitKeyCache, zkey),
  ]);
  return config.prover.prove(flattenWithdrawalCircuitInputs(parameters.witness), wasmArtifact, zkeyArtifact);
}

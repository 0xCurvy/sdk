import type { CurvyConfig } from "@/config/types";
import { loadCircuitKey } from "@/proving/circuitKeyCache";
import type { ProofResult, ZKArtifact } from "@/proving/prover";

/**
 * Load a circuit's wasm + zkey (through the config's key cache) and run the
 * flattened inputs through the config's `prover`. Shared by the aggregation +
 * withdrawal build/prove actions so the load-then-prove sequence lives once.
 */
export async function loadArtifactsAndProve(
  config: CurvyConfig,
  artifacts: { wasm: ZKArtifact; zkey: ZKArtifact; zkeySha256?: string },
  flattenedInputs: object,
): Promise<ProofResult> {
  const [wasmArtifact, zkeyArtifact] = await Promise.all([
    loadCircuitKey(config.circuitKeyCache, artifacts.wasm),
    loadCircuitKey(config.circuitKeyCache, artifacts.zkey, fetch, artifacts.zkeySha256),
  ]);
  return config.prover.prove(flattenedInputs, wasmArtifact, zkeyArtifact, {
    zkeySha256: artifacts.zkeySha256,
  });
}

import type { CurvyConfig } from "@/config/types";
import { evictCircuitKey, loadCircuitKey } from "@/proving/circuitKeyCache";
import type { ProofResult, ZKArtifact } from "@/proving/prover";

/**
 * Load a circuit's graph + zkey (through the config's key cache) and run the
 * flattened inputs through the config's `prover`. Shared by the aggregation +
 * withdrawal build/prove actions so the load-then-prove sequence lives once.
 */
export async function loadArtifactsAndProve(
  config: CurvyConfig,
  artifacts: {
    witnessGraph: ZKArtifact;
    witnessGraphSha256?: string;
    zkey: ZKArtifact;
    zkeySha256?: string;
  },
  flattenedInputs: object,
): Promise<ProofResult> {
  const prove = async () => {
    const [graphArtifact, zkeyArtifact] = await Promise.all([
      loadCircuitKey(config.circuitKeyCache, artifacts.witnessGraph, fetch, artifacts.witnessGraphSha256),
      loadCircuitKey(config.circuitKeyCache, artifacts.zkey, fetch, artifacts.zkeySha256),
    ]);
    return config.prover.prove(flattenedInputs, graphArtifact, zkeyArtifact, {
      witnessGraphSha256: artifacts.witnessGraphSha256,
      zkeySha256: artifacts.zkeySha256,
    });
  };

  try {
    return await prove();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("SHA-256 mismatch")) throw error;
    const evicted = await Promise.all([
      evictCircuitKey(config.circuitKeyCache, artifacts.witnessGraph, artifacts.witnessGraphSha256),
      evictCircuitKey(config.circuitKeyCache, artifacts.zkey, artifacts.zkeySha256),
    ]);
    if (!evicted.some(Boolean)) throw error;
    return prove();
  }
}

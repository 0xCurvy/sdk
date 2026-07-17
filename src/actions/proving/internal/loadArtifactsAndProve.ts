import type { CurvyConfig } from "@/config/types";
import { loadCachedArtifactsAndProve } from "@/proving/loadCachedArtifactsAndProve";
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
  if (config.prover.artifactLoading === "prover") {
    return config.prover.prove(flattenedInputs, artifacts.witnessGraph, artifacts.zkey, {
      witnessGraphSha256: artifacts.witnessGraphSha256,
      zkeySha256: artifacts.zkeySha256,
    });
  }

  return loadCachedArtifactsAndProve(config.prover, config.circuitKeyCache, artifacts, flattenedInputs);
}

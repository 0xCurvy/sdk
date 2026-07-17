import { type CircuitKeyCache, evictCircuitKey, loadCircuitKey } from "./circuitKeyCache";
import type { ProofResult, Prover, ZKArtifact } from "./prover";

export interface AuthenticatedCircuitArtifacts {
  witnessGraph: ZKArtifact;
  witnessGraphSha256?: string;
  zkey: ZKArtifact;
  zkeySha256?: string;
}

/** Load immutable circuit artifacts through a persistent cache and retry one corrupt cache entry. */
export async function loadCachedArtifactsAndProve(
  prover: Prover,
  cache: CircuitKeyCache | undefined,
  artifacts: AuthenticatedCircuitArtifacts,
  flattenedInputs: object,
  fetchFn: typeof fetch = fetch,
): Promise<ProofResult> {
  const prove = async (): Promise<ProofResult> => {
    const [graphArtifact, zkeyArtifact] = await Promise.all([
      loadCircuitKey(cache, artifacts.witnessGraph, fetchFn, artifacts.witnessGraphSha256),
      loadCircuitKey(cache, artifacts.zkey, fetchFn, artifacts.zkeySha256),
    ]);
    return prover.prove(flattenedInputs, graphArtifact, zkeyArtifact, {
      witnessGraphSha256: artifacts.witnessGraphSha256,
      zkeySha256: artifacts.zkeySha256,
    });
  };

  try {
    return await prove();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("SHA-256 mismatch")) throw error;
    const evicted = await Promise.all([
      evictCircuitKey(cache, artifacts.witnessGraph, artifacts.witnessGraphSha256),
      evictCircuitKey(cache, artifacts.zkey, artifacts.zkeySha256),
    ]);
    if (!evicted.some(Boolean)) throw error;
    return prove();
  }
}

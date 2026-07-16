export type ZKArtifact = string | Uint8Array;

export type Groth16Proof = {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
};

export type PublicSignals = string[];

/** Circuit kinds the SDK can prove client-side. */
export type CircuitId = "aggregation" | "withdrawal";

/** A Groth16 proof + its public signals — the output of any {@link Prover}. */
export type ProofResult = { proof: Groth16Proof; publicSignals: PublicSignals };

/** Authenticated artifact metadata resolved alongside a circuit configuration. */
export type ProverContext = {
  /** Trusted SHA-256 digest of the proving key bytes. */
  zkeySha256?: string;
  /** Trusted SHA-256 digest of the Curvy witness graph bytes. */
  witnessGraphSha256?: string;
};

/**
 * Pure proving seam. Artifact locations and digests come from protocol metadata;
 * implementations receive an authenticated witness graph plus proving key.
 */
export interface Prover {
  prove(input: object, witnessGraph: ZKArtifact, zkey: ZKArtifact, context?: ProverContext): Promise<ProofResult>;
  /** Release parsed graphs, keys, or platform workers owned by this instance. */
  destroy?(): void | Promise<void>;
}

export type CircuitConfig = {
  /** @deprecated The Rust witness graph is required by current SDK proving. */
  wasmPath?: string;
  /** Versioned Rust witness evaluator format. */
  witnessEngine?: "curvy-graph-v1";
  witnessGraphPath?: string;
  witnessGraphSha256?: string;
  zkeyPath?: string;
  /** SHA-256 of the proving key bytes advertised by protocol metadata. */
  zkeySha256?: string;
  vkeyPath?: string;
  treeDepth: number;
  maxInputs: number;
  maxOutputs: number;
  batchSize: number;
  groupFee: number;
};

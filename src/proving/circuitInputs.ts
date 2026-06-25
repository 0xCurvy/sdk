// Circuit input shapes consumed by the v2 zk-circuits wired into
// CurvyAggregatorAlphaV2:
//   - verifySingleAggregationNoHashing(maxInputs, maxOutputs, treeDepth)
//   - verifySingleWithdrawalNoHashing(maxInputs, treeDepth)
//   - verifyPendingNotesCommitment(batchSize, treeDepth)
//
// All three use a single per-call IMT inclusion proof shape (leafIndex +
// siblings, Poseidon-hashed). SMT-based v1 multi-request circuits are no
// longer wired and the matching types have been removed.

// Depth of the per-token gas-fee Merkle tree — INDEPENDENT of the notes `treeDepth` (30).
// Kept shallow so its root commits at most 2^GAS_FEE_TREE_DEPTH tokens and can be recomputed
// cheaply on-chain in setCommitmentGasCosts. MUST match the circuit's `gasTreeDepth` param.
export const GAS_FEE_TREE_DEPTH = 5;

// circom `bus Note()`: { owner: { ownerBabyJub[2], sharedSecret }, amount, token }
export type NoteBus = {
  owner: {
    ownerBabyJub: [bigint, bigint];
    sharedSecret: bigint;
  };
  amount: bigint;
  token: bigint;
};

// circom `bus NoteInclusionProof(treeDepth)`: { leafIndex, siblings[treeDepth] }
export type NoteInclusionProofBus = {
  leafIndex: bigint;
  siblings: bigint[];
};

// circom `bus Signature()`: { S, R8[2] }
export type SignatureBus = {
  S: bigint;
  R8: [bigint, bigint];
};

// circom `bus EncryptedNoteData()`: { encryptedAmount, encryptedToken, ephemeralKey[2], viewTag }
export type EncryptedNoteDataBus = {
  encryptedAmount: bigint;
  encryptedToken: bigint;
  ephemeralKey: [bigint, bigint];
  viewTag: bigint;
};

// Witness for VerifySingleAggregationNoHashing(maxInputs, maxOutputs, treeDepth).
// Public IO of the underlying circuit (snarkjs returns these as publicSignals):
//   [nullifiers..., outputNoteIds..., encryptedNoteData..., notesRoot,
//    protocolFeePerThousand, commitPendingNotesGasFeeRoot, feeNotePublicKey.x,
//    feeNotePublicKey.y]
// gasFee is now PRIVATE (pinned by Merkle inclusion under commitPendingNotesGasFeeRoot),
// so it no longer appears in publicSignals; its old slot now carries the root.
export type AggregationCircuitInputs = {
  inputNotes: NoteBus[];
  inputNoteInclusionProofs: NoteInclusionProofBus[];
  outputNotes: NoteBus[];
  publicKey: [bigint, bigint];
  signature: SignatureBus;
  feeNote: NoteBus;
  encryptedNoteData: EncryptedNoteDataBus[];
  notesRoot: bigint;
  protocolFeePerThousand: bigint;
  // PRIVATE: the per-token batch gas fee (token base units). Must equal the gas-fee tree
  // leaf at index = inputNotes[0].token.
  gasFee: bigint;
  // PRIVATE: Merkle path of `gasFee` (leaf) at index = token in the gas-fee tree.
  gasFeeSiblings: bigint[];
  // PUBLIC: root of the per-token commitment gas-fee tree (occupies gasFee's old slot).
  commitPendingNotesGasFeeRoot: bigint;
  feeNotePublicKey: [bigint, bigint];
};

// Witness for VerifySingleWithdrawalNoHashing(maxInputs, treeDepth).
// Public IO of the underlying circuit:
//   [withdrawnAmount, nullifiers..., notesRoot, destinationAddress, tokenId]
export type WithdrawCircuitInputs = {
  inputNotes: NoteBus[];
  publicKey: [bigint, bigint];
  inputNoteInclusionProofs: NoteInclusionProofBus[];
  signature: SignatureBus;
  notesRoot: bigint;
  destinationAddress: bigint;
  tokenId: bigint;
};

export type PendingNotesCommitmentCircuitInputs = {
  circuitInputs: {
    currentNoteIndex: bigint;
    inputHash: bigint;
    currentNotesRoot: bigint;
    pendingNoteIds: bigint[];
    siblings: bigint[][];
  };
  params: {
    newNotesRoot: bigint;
  };
};

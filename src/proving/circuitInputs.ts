// Circuit input shapes consumed by the v2 zk-circuits wired into
// CurvyAggregatorAlphaV2:
//   - verifySingleAggregationNoHashing(maxInputs, maxOutputs, treeDepth)
//   - verifySingleWithdrawalNoHashing(maxInputs, treeDepth)
//   - verifyPendingNotesCommitment(batchSize, treeDepth)
//
// All three use a single per-call IMT inclusion proof shape (leafIndex +
// siblings, Poseidon-hashed). SMT-based v1 multi-request circuits are no
// longer wired and the matching types have been removed.

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
//    protocolFeePerThousand, gasFee, feeNotePublicKey.x, feeNotePublicKey.y]
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
  gasFee: bigint;
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

// Circuit input shapes consumed by the deployed aggregator circuits:
//   - verifySingleAggregationNoHashing(maxInputs, maxOutputs, treeDepth)
//   - verifySingleWithdrawalNoHashing(maxInputs, treeDepth)
//   - verifyPendingNotesCommitment(batchSize, treeDepth)
//
// All use one Poseidon Merkle inclusion-proof shape: leaf index plus siblings.

// Depth of the per-token gas-fee Merkle tree — INDEPENDENT of the notes `treeDepth` (30).
// Kept shallow so its root commits at most 2^GAS_FEE_TREE_DEPTH tokens and can be recomputed
// cheaply on-chain in setCommitmentGasCosts. MUST match the circuit's `gasTreeDepth` param.
export const GAS_FEE_TREE_DEPTH = 6;

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
// Public IO of the underlying circuit (returned in the `publicSignals` proof envelope):
//   [nullifiers..., outputNoteIds..., encryptedNoteData..., notesRoot,
//    protocolFeePerThousand, commitPendingNotesGasFeeRoot, feeNotePublicKey.x,
//    feeNotePublicKey.y]
// gasFee is private and pinned by inclusion under commitPendingNotesGasFeeRoot.
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
  // PUBLIC: root of the per-token commitment gas-fee tree.
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

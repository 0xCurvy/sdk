import { Note } from "@/note";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import { ephemeralPubKey, pubFromPrivateKey, sign } from "./babyJubjub";
import { encryptAmountToken } from "./balanceCipher";
import type {
  AggregationCircuitInputs,
  EncryptedNoteDataBus,
  NoteBus,
  NoteInclusionProofBus,
  SignatureBus,
  WithdrawCircuitInputs,
} from "./circuitInputs";
import type { InclusionProof, MerkleTree } from "./merkleTree";
import { generateRandomBigInt } from "./utils";

// ─────────────────────────────────────────────────────────────────────────────
// From-REAL-notes witness builders for the v2 single-* circuits + the flatten
// step snarkjs needs.
//
// Why flatten: circom_runtime (0.1.28) consumes circom 2.2 `bus` inputs as FLAT
// arrays in field-declaration order, NOT nested `{field: value}` objects.
// Passing a NoteBus object directly to groth16.fullProve fails with
// "Not enough values for input signal inputNotes". These helpers convert the
// bus-typed `*CircuitInputs` (the SDK's logical witness shape) into the flat
// arrays fullProve accepts.
//
// Why from-notes: a witness must build inclusion proofs against the SAME tree
// the protocol committed — a fresh/synthetic IMT yields a `notesRoot` that is
// never `validNotesRoot` on-chain. So we prove against the real committed tree
// (`config._internal.notesTree`, mutated by generatePendingNotesCommitmentCircuitInputs)
// or against supplied lean witnesses.
// ─────────────────────────────────────────────────────────────────────────────

const noteBus = (n: Note): NoteBus => ({
  owner: {
    ownerBabyJub: [n.owner.babyJubjubPublicKey.x, n.owner.babyJubjubPublicKey.y],
    sharedSecret: n.owner.sharedSecret,
  },
  amount: n.amount,
  token: n.token,
});

// encryptedNoteData is pass-through public IO (declared `input`, never
// constrained against the note bus); the aggregator re-emits it in PendingNotes
// for the recipient to scan. We encrypt amount+token with the note's shared
// secret (AES-256-CTR additive field-OTP; see balanceCipher.ts). Integrity is
// provided by the on-chain noteId, not the cipher.
//
// `Note.ephemeralKey` is the ephemeral PUBLIC key `R = r·B` as a 2-coord point
// — exactly what the on-chain `ephemeralKey` field expects (TypesV2.sol:
// `uint256[2] ephemeralKey // [x, y]`). We emit `R` and nonce the cipher off
// `R` so the recipient — who only ever sees `R` — derives the same keystream.
const encNoteData = async (n: Note): Promise<EncryptedNoteDataBus> => {
  const ephemeralKey = n.ephemeralKey;
  const { encryptedAmount, encryptedToken } = await encryptAmountToken({
    amount: n.amount,
    token: n.token,
    sharedSecret: n.owner.sharedSecret,
    ephemeralKey,
  });
  return { encryptedAmount, encryptedToken, ephemeralKey, viewTag: n.viewTag };
};

const sameKey = (a: [bigint, bigint], b: { x: bigint; y: bigint }) => a[0] === b.x && a[1] === b.y;

// The deployed circuit's VerifyInclusionProof `shouldSkip` is a no-op
// (`computedRoot <== hashes[treeDepth]` unconditionally) and the caller asserts
// `computedRoots[i] === notesRoot` for EVERY slot — so every input note, even a
// zero-amount one, must be a real committed leaf with a genuine inclusion proof.
const inclusionProofFor = (notesTree: MerkleTree, note: Note): NoteInclusionProofBus => {
  const idx = notesTree.getIndex(note.id);
  if (idx === null) {
    throw new Error(`note ${note.id} is not in the committed notes tree (commit it before spending)`);
  }
  return { leafIndex: BigInt(idx), siblings: notesTree.createInclusionProof(note.id).siblings };
};

/**
 * Pre-built inclusion proofs as an alternative to a live `MerkleTree` — the
 * lean-client path. The proofs come from `ShardedNotesTree.witness()` (or any
 * other source) and MUST all be against the same root: the circuit takes a
 * single `notesRoot` and asserts every input slot's path hashes to it.
 */
export type SuppliedInclusionProofs = {
  /** One proof per input note, in input order. */
  proofs: InclusionProof[];
  /** The common root every proof was built against. */
  notesRoot: bigint;
};

// Either derive proofs from the full tree (full-tree profile) or adopt the
// supplied ones (lean profile) after cheap consistency gates: proof i must be
// for note i's id, and every proof must carry the common root. (These catch
// mis-assembly before an expensive proving run; cryptographic validity is
// enforced by the circuit itself.)
const resolveInclusionProofs = (
  notes: Note[],
  notesTree: MerkleTree | undefined,
  supplied: SuppliedInclusionProofs | undefined,
): { proofs: NoteInclusionProofBus[]; notesRoot: bigint } => {
  if (supplied) {
    if (supplied.proofs.length !== notes.length) {
      throw new Error(`supplied inclusion proofs: expected ${notes.length}, got ${supplied.proofs.length}`);
    }
    notes.forEach((n, i) => {
      const p = supplied.proofs[i];
      if (p.leaf !== n.id) {
        throw new Error(`supplied inclusion proofs: proof ${i} is for leaf ${p.leaf}, but note ${i} has id ${n.id}`);
      }
      if (p.root !== supplied.notesRoot) {
        throw new Error(`supplied inclusion proofs: proof ${i} was built against a different root than notesRoot`);
      }
    });
    return {
      proofs: supplied.proofs.map((p) => ({ leafIndex: BigInt(p.index), siblings: p.siblings })),
      notesRoot: supplied.notesRoot,
    };
  }
  if (!notesTree) throw new Error("witness builder: provide either `notesTree` or `supplied` inclusion proofs");
  return { proofs: notes.map((n) => inclusionProofFor(notesTree, n)), notesRoot: notesTree.root() };
};

// Zero-amount padding note. Used for BOTH input-slot padding (never emitted)
// and OUTPUT-slot padding, which IS emitted to PendingNotes — so it gets a
// fresh real ephemeral key, making pad slots indistinguishable on-chain from
// ordinary (undecryptable-to-observers) deliveries instead of structurally
// zero `R = [0,0]` entries that leak the real output count. The ephemeral key
// is pass-through IO (not constrained by the circuit, not part of the noteId),
// so this is purely a privacy improvement.
const zeroPadNote = (owner: [bigint, bigint], token: bigint): Note =>
  new Note({
    amount: 0n,
    token,
    owner: { babyJubjubPublicKey: { x: owner[0], y: owner[1] }, sharedSecret: generateRandomBigInt() },
    ephemeralKey: ephemeralPubKey(generateRandomBigInt()),
    viewTag: 0n,
  });

// ── Flatten (bus-typed witness → snarkjs flat witness) ──────────────────────
const flatNote = (n: NoteBus): bigint[] => [
  n.owner.ownerBabyJub[0],
  n.owner.ownerBabyJub[1],
  n.owner.sharedSecret,
  n.amount,
  n.token,
];
const flatInclusion = (p: NoteInclusionProofBus): bigint[] => [p.leafIndex, ...p.siblings];
const flatSignature = (s: SignatureBus): bigint[] => [s.S, s.R8[0], s.R8[1]];
const flatEncrypted = (e: EncryptedNoteDataBus): bigint[] => [
  e.encryptedAmount,
  e.encryptedToken,
  e.ephemeralKey[0],
  e.ephemeralKey[1],
  e.viewTag,
];

/** Flatten `WithdrawCircuitInputs` into the witness `groth16.fullProve` expects. */
export const flattenWithdrawalCircuitInputs = (w: WithdrawCircuitInputs) => ({
  inputNotes: w.inputNotes.map(flatNote),
  publicKey: w.publicKey,
  inputNoteInclusionProofs: w.inputNoteInclusionProofs.map(flatInclusion),
  signature: flatSignature(w.signature),
  notesRoot: w.notesRoot,
  destinationAddress: w.destinationAddress,
  tokenId: w.tokenId,
});

/** Flatten `AggregationCircuitInputs` into the witness `groth16.fullProve` expects. */
export const flattenAggregationCircuitInputs = (a: AggregationCircuitInputs) => ({
  inputNotes: a.inputNotes.map(flatNote),
  inputNoteInclusionProofs: a.inputNoteInclusionProofs.map(flatInclusion),
  outputNotes: a.outputNotes.map(flatNote),
  publicKey: a.publicKey,
  signature: flatSignature(a.signature),
  feeNote: flatNote(a.feeNote),
  encryptedNoteData: a.encryptedNoteData.map(flatEncrypted),
  notesRoot: a.notesRoot,
  protocolFeePerThousand: a.protocolFeePerThousand,
  gasFee: a.gasFee,
  feeNotePublicKey: a.feeNotePublicKey,
});

// ── Withdrawal from real notes ──────────────────────────────────────────────
export type WithdrawalFromNotesParams = {
  /** The real, committed notes to spend (1..maxInputs, all owned by `ownerBjjPrivateKeyHex`). */
  notes: Note[];
  /** BabyJubjub private key (hex) of the notes' owner; signs the withdrawal. */
  ownerBjjPrivateKeyHex: string;
  /** The committed notes tree (config._internal.notesTree) — NOT a fresh one. Omit when `supplied` is set. */
  notesTree?: MerkleTree;
  /** Lean-profile alternative: pre-built proofs (e.g. from ShardedNotesTree.witness), all at one root. */
  supplied?: SuppliedInclusionProofs;
  destinationAddress: bigint;
  tokenId: bigint;
  maxInputs: number;
  treeDepth: number;
};

/**
 * Build a `VerifySingleWithdrawalNoHashing(maxInputs, treeDepth)` witness from
 * real committed notes. Inclusion proofs come from the live committed tree, so
 * the witness `notesRoot` equals the on-chain `validNotesRoot` — no storage
 * seeding. Requires exactly `maxInputs` committed notes (the circuit verifies
 * inclusion for every slot; there is no working skip path).
 */
export const generateWithdrawalCircuitInputsFromNotes = async ({
  notes,
  ownerBjjPrivateKeyHex,
  notesTree,
  supplied,
  destinationAddress,
  tokenId,
  maxInputs,
}: WithdrawalFromNotesParams): Promise<WithdrawCircuitInputs> => {
  // The deployed circuit asserts `computedRoots[i] === notesRoot` for EVERY slot
  // (VerifyInclusionProof's shouldSkip is a no-op), so every input slot must be a
  // real committed leaf — no zero-amount skip padding. Provide exactly maxInputs
  // committed notes (a zero-amount note is fine, but it must be committed).
  if (notes.length !== maxInputs) {
    throw new Error(
      `withdrawal: the deployed circuit requires exactly maxInputs (${maxInputs}) real committed input notes; got ${notes.length}`,
    );
  }
  const publicKey = pubFromPrivateKey(ownerBjjPrivateKeyHex);
  for (const n of notes) {
    if (n.token !== tokenId) throw new Error(`withdrawal: note token ${n.token} !== tokenId ${tokenId}`);
    if (!sameKey(publicKey, n.owner.babyJubjubPublicKey)) {
      throw new Error("withdrawal: every input note must be owned by the signing key (single-sender circuit)");
    }
  }

  const { proofs: inputNoteInclusionProofs, notesRoot } = resolveInclusionProofs(notes, notesTree, supplied);
  const totalAmount = notes.reduce((acc, n) => acc + n.amount, 0n);
  const msg = poseidonHash([...notes.map((n) => n.nullifier), destinationAddress, totalAmount, tokenId]);
  const signature = sign(msg, ownerBjjPrivateKeyHex);

  return {
    inputNotes: notes.map(noteBus),
    publicKey,
    inputNoteInclusionProofs,
    signature: { S: signature.S, R8: [signature.R8[0], signature.R8[1]] },
    notesRoot,
    destinationAddress,
    tokenId,
  };
};

// ── Aggregation from real notes ─────────────────────────────────────────────
/** A raw stealth-tuple recipient (random ephemeral key → the note is undiscoverable
 *  by scanning; fine for self-notes and tests). For DISCOVERABLE delivery to a real
 *  recipient, pre-resolve the output note via `core.sendNote` and pass `recipientNotes`. */
export type AggregationRecipient = { amount: bigint; ownerPub: [bigint, bigint]; sharedSecret: bigint };

export type AggregationFromNotesParams = {
  /** Real committed input notes to consume (1..maxInputs, single owner). */
  inputNotes: Note[];
  ownerBjjPrivateKeyHex: string;
  /** Raw stealth-tuple recipients (undiscoverable). Provide this OR `recipientNotes`. */
  recipients?: AggregationRecipient[];
  /** Pre-resolved recipient output notes — e.g. real stealth deliveries from `core.sendNote`
   *  (discoverable). Provide this OR `recipients`. */
  recipientNotes?: Note[];
  /** Owner of the protocol fee note; must equal the on-chain feeNotePublicKey (the
   *  aggregation circuit takes it as a public input and the contract checks equality). */
  feeNotePublicKey: [bigint, bigint];
  /** Must equal the on-chain protocolFeePerThousand / gasFee (contract asserts equality). */
  protocolFeePerThousand: bigint;
  gasFee: bigint;
  /** The committed notes tree — omit when `supplied` is set. */
  notesTree?: MerkleTree;
  /** Lean-profile alternative: pre-built proofs (e.g. from ShardedNotesTree.witness), all at one root. */
  supplied?: SuppliedInclusionProofs;
  /**
   * Coherently seal the change-to-self note so it is DISCOVERABLE on rescan/fresh
   * device — wire this to `core.sendNote(selfS, selfV, …)` (real ECDH stealth
   * delivery to the sender). When omitted, the change note falls back to a random,
   * uncorrelated ephemeral/sharedSecret and is permanently undiscoverable (the
   * legacy behaviour; acceptable only when `change` is 0 or for raw-tuple tests).
   * The sealed note MUST own `change` for the sender (validated below).
   */
  sealChange?: (amount: bigint) => Promise<Note>;
  /**
   * Coherently seal the protocol FEE note so the fee collector can later spend it.
   * The fee note is owned by `feeNotePublicKey` but, like any stealth note, its
   * `noteId`/`nullifier` depend on `sharedSecret = ECDH(feeViewKey, R)`. The fee
   * collector reconstructs it from its OWN keys, so the sharedSecret must derive
   * from the fee collector's viewing key — which the bare SDK-direct path does not
   * have (the contract exposes only `feeNotePublicKey`). Wire this to the
   * fee-collector-aware stealth delivery when those keys are in scope. When omitted,
   * the fee note falls back to a random tuple (uncollectable for a non-zero fee), so
   * supply it for any aggregation that charges a protocol fee. The sealed note MUST
   * own `feeAmount` for `feeNotePublicKey` (validated below).
   */
  sealFee?: (amount: bigint) => Promise<Note>;
  maxInputs: number;
  maxOutputs: number;
  treeDepth: number;
};

/** The witness plus the actual output/fee Note objects the proof commits to. */
export type AggregationWitnessBundle = {
  witness: AggregationCircuitInputs;
  /** All maxOutputs output notes (recipients + change-to-self + zero-pad), in signal order.
   *  These are the new PENDING notes — commit them before they can be spent. */
  outputNotes: Note[];
  /** The protocol fee note (owned by feeNotePublicKey). */
  feeNote: Note;
};

/**
 * Build a `VerifySingleAggregationNoHashing(maxInputs, maxOutputs, treeDepth)`
 * witness from real committed input notes, returning the witness AND the resolved
 * output/fee Note objects. Fee math mirrors the circuit:
 *   spentToOthers = sum(recipient amounts)
 *   feeAmount     = gasFee + floor(spentToOthers * protocolFeePerThousand / 1000)
 *   change(self)  = totalInput - spentToOthers - feeAmount   (must be >= 0)
 * Outputs = [recipients..., change-to-self] padded to maxOutputs; fee note owned by
 * feeNotePublicKey. Output notes become new PENDING notes (commit them to spend).
 */
export const buildAggregationWitnessBundle = async ({
  inputNotes,
  ownerBjjPrivateKeyHex,
  recipients,
  recipientNotes,
  feeNotePublicKey,
  protocolFeePerThousand,
  gasFee,
  notesTree,
  supplied,
  sealChange,
  sealFee,
  maxInputs,
  maxOutputs,
}: AggregationFromNotesParams): Promise<AggregationWitnessBundle> => {
  // Same as withdrawal: every input slot must be a real committed leaf.
  if (inputNotes.length !== maxInputs) {
    throw new Error(
      `aggregation: the deployed circuit requires exactly maxInputs (${maxInputs}) real committed input notes; got ${inputNotes.length}`,
    );
  }
  const token = inputNotes[0].token;
  const publicKey = pubFromPrivateKey(ownerBjjPrivateKeyHex);
  for (const n of inputNotes) {
    if (n.token !== token) throw new Error("aggregation: all input notes must share one token");
    if (!sameKey(publicKey, n.owner.babyJubjubPublicKey)) {
      throw new Error("aggregation: every input note must be owned by the signing key (single-sender circuit)");
    }
  }

  // Resolve the recipient output notes from EITHER pre-built notes (discoverable
  // stealth delivery via core.sendNote) or raw stealth tuples (undiscoverable;
  // constructed here with a random ephemeral key).
  if ((recipientNotes && recipients) || (!recipientNotes && !recipients)) {
    throw new Error("aggregation: provide exactly one of `recipients` or `recipientNotes`");
  }
  const recipientOutputNotes: Note[] =
    recipientNotes ??
    (recipients as AggregationRecipient[]).map(
      (r) =>
        new Note({
          amount: r.amount,
          token,
          owner: { babyJubjubPublicKey: { x: r.ownerPub[0], y: r.ownerPub[1] }, sharedSecret: r.sharedSecret },
          ephemeralKey: ephemeralPubKey(generateRandomBigInt()),
          viewTag: 0n,
        }),
    );
  if (recipientOutputNotes.length + 1 > maxOutputs) {
    throw new Error(
      `aggregation: recipients (${recipientOutputNotes.length}) + change exceed maxOutputs (${maxOutputs})`,
    );
  }

  const totalInput = inputNotes.reduce((acc, n) => acc + n.amount, 0n);
  const spentToOthers = recipientOutputNotes.reduce((acc, n) => acc + n.amount, 0n);
  const feeAmount = gasFee + (spentToOthers * protocolFeePerThousand) / 1000n;
  const change = totalInput - spentToOthers - feeAmount;
  if (change < 0n) throw new Error(`aggregation: change negative (${change}); reduce outputs or fees`);

  const outputNotes: Note[] = [...recipientOutputNotes];
  // Change back to sender. `sealChange` (real ECDH stealth delivery to self) makes
  // it DISCOVERABLE on rescan; without it the change note carries a random,
  // uncorrelated ephemeral/sharedSecret and is lost on any re-scan / fresh device.
  // Only a value-bearing change note needs sealing — a zero-amount change is a
  // throwaway slot, so we keep it a random dummy (no point polluting the owner's
  // balances with a discoverable 0-note).
  const changeNote =
    sealChange && change > 0n
      ? await sealChange(change)
      : new Note({
          amount: change,
          token,
          owner: { babyJubjubPublicKey: { x: publicKey[0], y: publicKey[1] }, sharedSecret: generateRandomBigInt() },
          ephemeralKey: ephemeralPubKey(generateRandomBigInt()),
          viewTag: 0n,
        });
  // The change must be spendable by the sender later: it has to own exactly `change`.
  if (changeNote.amount !== change || !sameKey(publicKey, changeNote.owner.babyJubjubPublicKey)) {
    throw new Error("aggregation: sealed change note must own `change` for the sender (mismatched amount/owner)");
  }
  outputNotes.push(changeNote);
  while (outputNotes.length < maxOutputs) outputNotes.push(zeroPadNote(publicKey, token));

  // The fee note is owned by the protocol (`feeNotePublicKey`) but is a stealth
  // note: its noteId/nullifier depend on `sharedSecret`. The fee collector
  // recomputes it from ECDH(feeViewKey, R), so a random sharedSecret/R makes the
  // fee PERMANENTLY UNCOLLECTABLE. `sealFee` (the fee-collector-aware delivery)
  // makes a non-zero fee spendable; the bare SDK-direct path has no access to the
  // collector's viewing key (the contract exposes only feeNotePublicKey), so when
  // it is omitted the fee note falls back to a random tuple — harmless for a zero
  // fee, but an uncollectable protocol fee for a non-zero one (set the on-chain
  // fee to 0, or supply `sealFee`/`feeRecipient` from operator config, to recover it).
  let feeNote: Note;
  if (sealFee && feeAmount > 0n) {
    feeNote = await sealFee(feeAmount);
    if (feeNote.amount !== feeAmount || !sameKey(feeNotePublicKey, feeNote.owner.babyJubjubPublicKey)) {
      throw new Error(
        "aggregation: sealed fee note must own `feeAmount` for `feeNotePublicKey` (mismatched amount/owner)",
      );
    }
  } else {
    feeNote = new Note({
      amount: feeAmount,
      token,
      owner: {
        babyJubjubPublicKey: { x: feeNotePublicKey[0], y: feeNotePublicKey[1] },
        sharedSecret: generateRandomBigInt(),
      },
      ephemeralKey: ephemeralPubKey(generateRandomBigInt()),
      viewTag: 0n,
    });
  }

  const allInputs: Note[] = [...inputNotes];
  while (allInputs.length < maxInputs) allInputs.push(zeroPadNote(publicKey, token));
  const { proofs: inputNoteInclusionProofs, notesRoot } = resolveInclusionProofs(allInputs, notesTree, supplied);

  const encryptedNoteData = await Promise.all([...outputNotes, feeNote].map((n) => encNoteData(n)));

  const outputNoteHash = poseidonHash(outputNotes.map((n) => n.id));
  const encryptedNoteDataHash = poseidonHash(
    encryptedNoteData.flatMap((encryptedNote) => [
      BigInt(encryptedNote.encryptedAmount),
      BigInt(encryptedNote.encryptedToken),
    ]),
  );
  const signingHash = poseidonHash([outputNoteHash, encryptedNoteDataHash]);
  const signature = sign(signingHash, ownerBjjPrivateKeyHex);

  const witness: AggregationCircuitInputs = {
    inputNotes: allInputs.map(noteBus),
    inputNoteInclusionProofs,
    outputNotes: outputNotes.map(noteBus),
    publicKey,
    signature: { S: signature.S, R8: [signature.R8[0], signature.R8[1]] },
    feeNote: noteBus(feeNote),
    encryptedNoteData,
    notesRoot,
    protocolFeePerThousand,
    gasFee,
    feeNotePublicKey,
  };
  return { witness, outputNotes, feeNote };
};

/**
 * Thin wrapper over {@link buildAggregationWitnessBundle} that returns just the
 * witness (back-compat for callers that don't need the output Note objects).
 */
export const generateAggregationCircuitInputsFromNotes = async (
  params: AggregationFromNotesParams,
): Promise<AggregationCircuitInputs> => (await buildAggregationWitnessBundle(params)).witness;

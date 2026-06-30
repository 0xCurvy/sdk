import { Note } from "@/note";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import { ephemeralPubKey, pubFromPrivateKey, sign } from "./babyJubjub";
import { encryptAmountToken } from "./balanceCipher";
import {
  type AggregationCircuitInputs,
  type EncryptedNoteDataBus,
  GAS_FEE_TREE_DEPTH,
  type NoteBus,
  type NoteInclusionProofBus,
  type SignatureBus,
  type WithdrawCircuitInputs,
} from "./circuitInputs";
import type { InclusionProof } from "./merkleTree";
import { MerkleTree } from "./merkleTree";
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

// Genuine inclusion proof for a REAL committed note (must hash to the root). Zero-amount
// pad slots are handled by `resolveInclusionProofs`: BOTH the AGGREGATION and the
// WITHDRAWAL circuits are skip-aware — `VerifyInclusionProof` skips zero-amount slots
// (`shouldSkip = isZeroAmount` → the root constraint collapses to `0 === 0`), so those
// slots get a dummy proof and never reach this. Only REAL (non-zero) notes do.
// DO NOT "fix" the dummy pad proofs into genuine ones: the withdrawal circuit skips
// the pads exactly like aggregation (see generateWithdrawalCircuitInputsFromNotes).
const inclusionProofFor = (notesTree: MerkleTree, note: Note): NoteInclusionProofBus => {
  const idx = notesTree.getIndex(note.id);
  if (idx === null) {
    throw new Error(`note ${note.id} is not in the committed notes tree (commit it before spending)`);
  }
  return { leafIndex: BigInt(idx), siblings: notesTree.createInclusionProof(note.id).siblings };
};

// A zero-amount pad slot the circuit skips: leaf index + siblings are unconstrained
// (VerifyInclusionProof's check collapses to `0 === 0`), so any well-shaped proof works.
const dummyInclusionProof = (treeDepth: number): NoteInclusionProofBus => ({
  leafIndex: 0n,
  siblings: Array.from({ length: treeDepth }, () => 0n),
});

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
  treeDepth: number,
  allowZeroSkip = false,
): { proofs: NoteInclusionProofBus[]; notesRoot: bigint } => {
  // A zero-amount input slot is skipped by BOTH the AGGREGATION and WITHDRAWAL circuits
  // (shouldSkip = isZeroAmount), so it needs no committed leaf — give it a dummy proof.
  // Both builders pass `allowZeroSkip=true` (the withdrawal circuit is skip-aware too),
  // so zero-amount pad slots never require a genuine proof.
  const skippable = (n: Note) => allowZeroSkip && n.amount === 0n;

  if (supplied) {
    // Supplied proofs cover the REAL (non-skippable) notes, in note order; the builder
    // appends zero-amount pad slots after them, resolved to dummy proofs here.
    const realCount = notes.filter((n) => !skippable(n)).length;
    if (supplied.proofs.length !== realCount) {
      throw new Error(`supplied inclusion proofs: expected ${realCount}, got ${supplied.proofs.length}`);
    }
    let realIdx = 0;
    const proofs = notes.map((n) => {
      if (skippable(n)) return dummyInclusionProof(treeDepth);
      const p = supplied.proofs[realIdx++];
      if (p.leaf !== n.id) {
        throw new Error(`supplied inclusion proofs: proof for leaf ${p.leaf}, but note has id ${n.id}`);
      }
      if (p.root !== supplied.notesRoot) {
        throw new Error("supplied inclusion proofs: a proof was built against a different root than notesRoot");
      }
      return { leafIndex: BigInt(p.index), siblings: p.siblings };
    });
    return { proofs, notesRoot: supplied.notesRoot };
  }
  if (!notesTree) throw new Error("witness builder: provide either `notesTree` or `supplied` inclusion proofs");
  const proofs = notes.map((n) => (skippable(n) ? dummyInclusionProof(treeDepth) : inclusionProofFor(notesTree, n)));
  return { proofs, notesRoot: notesTree.root() };
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
  // gasFee is now PRIVATE (pinned by Merkle inclusion under commitPendingNotesGasFeeRoot);
  // gasFeeSiblings is the path, leaf index = inputNotes[0].token (derived in-circuit).
  gasFee: a.gasFee,
  gasFeeSiblings: a.gasFeeSiblings,
  commitPendingNotesGasFeeRoot: a.commitPendingNotesGasFeeRoot,
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
 * seeding. Accepts 1..maxInputs real committed notes: the circuit's
 * `VerifyInclusionProof` is skip-aware (`shouldSkip = isZeroAmount` → the root
 * constraint collapses to `0 === 0` for zero-amount slots, same as aggregation),
 * so the builder zero-pads the unused slots — a single note IS spendable.
 */
export const generateWithdrawalCircuitInputsFromNotes = async ({
  notes,
  ownerBjjPrivateKeyHex,
  notesTree,
  supplied,
  destinationAddress,
  tokenId,
  maxInputs,
  treeDepth,
}: WithdrawalFromNotesParams): Promise<WithdrawCircuitInputs> => {
  // 1..maxInputs real committed notes; the circuit zero-skips the padded slots
  // (mirrors buildAggregationWitnessBundle). Only TOO MANY is unspendable here.
  if (notes.length < 1 || notes.length > maxInputs) {
    throw new Error(
      `withdrawal: need 1..${maxInputs} real committed input notes (the circuit zero-pads the rest); got ${notes.length}`,
    );
  }
  const publicKey = pubFromPrivateKey(ownerBjjPrivateKeyHex);
  for (const n of notes) {
    if (n.token !== tokenId) throw new Error(`withdrawal: note token ${n.token} !== tokenId ${tokenId}`);
    if (!sameKey(publicKey, n.owner.babyJubjubPublicKey)) {
      throw new Error("withdrawal: every input note must be owned by the signing key (single-sender circuit)");
    }
  }

  // Zero-pad the unused input slots up to maxInputs; `resolveInclusionProofs`
  // (allowZeroSkip=true) gives the pads dummy proofs, and the circuit skips them.
  const allInputs: Note[] = [...notes];
  while (allInputs.length < maxInputs) allInputs.push(zeroPadNote(publicKey, tokenId));

  const { proofs: inputNoteInclusionProofs, notesRoot } = resolveInclusionProofs(
    allInputs,
    notesTree,
    supplied,
    treeDepth,
    true,
  );
  // totalAmount sums every slot (pads are 0); the signature commits ALL maxInputs
  // nullifiers (incl. pads) because the circuit's outputHasher does.
  const totalAmount = allInputs.reduce((acc, n) => acc + n.amount, 0n);
  const msg = poseidonHash([...allInputs.map((n) => n.nullifier), destinationAddress, totalAmount, tokenId]);
  const signature = sign(msg, ownerBjjPrivateKeyHex);

  return {
    inputNotes: allInputs.map(noteBus),
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
  /** Must equal the on-chain protocolFeePerThousand (contract asserts equality). */
  protocolFeePerThousand: bigint;
  /** The per-token batch gas fee in the inputs' token base units. Now PRIVATE in-circuit and
   *  pinned by Merkle inclusion: it MUST equal the committed gas-fee tree leaf at index = token
   *  (the contract accepts the proof's root rather than this value). */
  gasFee: bigint;
  /** The per-token commitment gas-fee tree (leaf[tokenId] = cost, depth = GAS_FEE_TREE_DEPTH),
   *  built from the on-chain `getCommitmentGasCosts()` table. The builder proves leaf inclusion at
   *  index = the inputs' token. When omitted, a synthetic single-entry tree is built from `gasFee`
   *  (fine for self-contained circuit tests, but its root won't match a deployed contract). */
  gasFeeTree?: MerkleTree;
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
   * fee-collector-aware stealth delivery when those keys are in scope. A zero fee needs
   * no sealing (the fee note is a throwaway tuple); a NON-ZERO fee without `sealFee`
   * THROWS rather than minting a permanently uncollectable fee note. The sealed note
   * MUST own `feeAmount` for `feeNotePublicKey` (validated below).
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
  gasFeeTree,
  notesTree,
  supplied,
  sealChange,
  sealFee,
  maxInputs,
  maxOutputs,
  treeDepth,
}: AggregationFromNotesParams): Promise<AggregationWitnessBundle> => {
  // The aggregation circuit zero-pads unused input slots (VerifyInclusionProof skips
  // zero-amount notes), so 1..maxInputs real committed notes are allowed — the builder
  // pads the rest below. Only TOO MANY is unspendable here (fold the excess first).
  if (inputNotes.length < 1 || inputNotes.length > maxInputs) {
    throw new Error(
      `aggregation: need 1..${maxInputs} real committed input notes (the circuit zero-pads the rest); got ${inputNotes.length}`,
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
  // All value routed to recipient slots (INCLUDING a self-directed carve-out note),
  // used for change/conservation: change = inputs − recipients − fee, mirroring the
  // circuit's `Σoutputs = Σinputs − feeNote.amount`.
  const spentToRecipients = recipientOutputNotes.reduce((acc, n) => acc + n.amount, 0n);
  // The protocol fee is charged ONLY on value LEAVING the sender. The circuit's
  // `totalSpentValue` skips sender-owned outputs (the in-circuit `isSender` check), so
  // exclude recipient notes the sender owns — e.g. a withdrawal carve-out's self note.
  // Otherwise the SDK's feeNote amount wouldn't match the circuit and the proof fails.
  const spentToOthers = recipientOutputNotes
    .filter((n) => !sameKey(publicKey, n.owner.babyJubjubPublicKey))
    .reduce((acc, n) => acc + n.amount, 0n);
  const feeAmount = gasFee + (spentToOthers * protocolFeePerThousand) / 1000n;
  const change = totalInput - spentToRecipients - feeAmount;
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
  // A non-zero protocol fee MUST be sealed to the fee collector, or it is emitted with a
  // random sharedSecret and becomes permanently uncollectable. Refuse to silently mint
  // dead value (the previous behaviour contradicted this function's own `sealFee` JSDoc).
  if (feeAmount > 0n && !sealFee) {
    throw new Error(
      `aggregation: a non-zero protocol fee (${feeAmount}) requires \`sealFee\` (fee-collector stealth delivery); ` +
        "without it the fee note is emitted with a random sharedSecret and is permanently uncollectable",
    );
  }
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
  const { proofs: inputNoteInclusionProofs, notesRoot } = resolveInclusionProofs(
    allInputs,
    notesTree,
    supplied,
    treeDepth,
    true,
  );

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

  // Per-token gas fee: prove (token -> gasFee) membership in the gas-fee tree. The circuit
  // takes the leaf index = inputNotes[0].token (derived internally) and the leaf value = the
  // private gasFee, and verifies inclusion under the public commitPendingNotesGasFeeRoot. The
  // tree leaf at index = token MUST equal gasFee (else the on-chain root won't match).
  // The gas-fee tree has 2^GAS_FEE_TREE_DEPTH leaves, indexed by token id. Validate
  // BigInt-safe BEFORE narrowing to Number — otherwise an out-of-range token would
  // silently alias onto another leaf (or overflow Number) and prove the wrong cost.
  const maxTokens = 1n << BigInt(GAS_FEE_TREE_DEPTH);
  if (token < 0n || token >= maxTokens) {
    throw new Error(
      `aggregation: token ${token} is out of range for the gas-fee tree (must be 0..2^${GAS_FEE_TREE_DEPTH}-1 = ${maxTokens - 1n})`,
    );
  }
  const tokenIndex = Number(token);
  const gasTree = gasFeeTree ?? buildSyntheticGasFeeTree(tokenIndex, gasFee);
  const gasFeeProof = gasTree.createInclusionProofAtIndex(tokenIndex);
  if (gasFeeProof.leaf !== gasFee) {
    throw new Error(
      `aggregation: gasFee (${gasFee}) does not match the committed per-token cost (${gasFeeProof.leaf}) for token ${token}`,
    );
  }

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
    gasFeeSiblings: gasFeeProof.siblings,
    commitPendingNotesGasFeeRoot: gasFeeProof.root,
    feeNotePublicKey,
  };
  return { witness, outputNotes, feeNote };
};

/**
 * Synthesize a depth-`GAS_FEE_TREE_DEPTH` gas-fee tree holding `gasFee` at index `tokenIndex`
 * (zeros elsewhere) for self-contained circuit tests that prove against their own root.
 * Real flows pass the actual committed tree built from `getCommitmentGasCosts()`.
 */
const buildSyntheticGasFeeTree = (tokenIndex: number, gasFee: bigint): MerkleTree => {
  const leaves = new Array<bigint>(tokenIndex + 1).fill(0n);
  leaves[tokenIndex] = gasFee;
  return MerkleTree.fromOrderedLeaves({ depth: GAS_FEE_TREE_DEPTH }, leaves);
};

/**
 * Thin wrapper over {@link buildAggregationWitnessBundle} that returns just the
 * witness (back-compat for callers that don't need the output Note objects).
 */
export const generateAggregationCircuitInputsFromNotes = async (
  params: AggregationFromNotesParams,
): Promise<AggregationCircuitInputs> => (await buildAggregationWitnessBundle(params)).witness;

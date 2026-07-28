import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { Note } from "@/note";
import type { SuppliedInclusionProofs } from "@/proving";
import { GAS_FEE_TREE_DEPTH, MerkleTree } from "@/proving";
import { formatGroth16ProofForSolidity } from "@/proving/groth16";
import { buildAggregationWitnessBundle, flattenAggregationCircuitInputs } from "@/proving/witnessFromNotes";
import type { CurvyPublicKeys } from "@/types/core";
import { loadArtifactsAndProve } from "../proving/internal/loadArtifactsAndProve";
import { resolveCircuitArtifacts } from "../proving/internal/resolveCircuitArtifacts";
import { attachSubmissionSugar } from "./internal/attachSugar";
import { fetchAggregatorFees } from "./internal/fetchAggregatorFees";
import { resolveRecipients } from "./internal/resolveRecipients";
import type { AggregateRecipientInput, SubmittableSubmission } from "./types";

export type BuildAggregateRequestParameters = WithConfig<{
  /** The real committed input notes to spend (exactly the circuit's maxInputs). */
  inputNotes: Note[];
  /** BabyJubjub private key (hex) that owns the input notes and signs the aggregation. */
  ownerBjjPrivateKeyHex: string;
  /** Recipients — Curvy handle, explicit keys, or a raw stealth tuple. Change + fee are added for you. */
  recipients: AggregateRecipientInput[];
  /**
   * The sender's own public keys, used to stealth-deliver the CHANGE note back to
   * self so it is DISCOVERABLE on rescan (must correspond to `ownerBjjPrivateKeyHex`).
   * Omit only when no change is expected (or for raw-tuple/test usage) — without it
   * the change note is permanently undiscoverable/unspendable.
   */
  changeRecipient?: CurvyPublicKeys;
  /**
   * The protocol fee collector's public keys, used to stealth-deliver the FEE note
   * so the collector can later spend it. REQUIRED whenever the on-chain fee is
   * non-zero: without it the fee note is emitted with a random sharedSecret and is
   * permanently uncollectable (so a non-zero fee throws). The bare client has no
   * access to the fee collector's viewing key (the contract exposes only
   * `feeNotePublicKey`); supply it from operator/relayer config when available.
   */
  feeRecipient?: CurvyPublicKeys;
  /**
   * The operator paymaster's public keys. When set together with a positive
   * {@link operatorFee}, a dedicated gas-reimbursement output note is stealth-
   * delivered to the operator (so it can discover + spend it) — this is the note
   * the relayer's paymaster gate scans for and amount-checks before relaying. Size
   * `operatorFee` with {@link estimateAggregationCosts}. Adding it consumes one
   * `maxOutputs` slot (recipients + operator + change must fit `maxOutputs`).
   */
  operatorRecipient?: CurvyPublicKeys;
  /** The gas-reimbursement amount (token base units) for the {@link operatorRecipient} note. */
  operatorFee?: bigint;
  // protocolFeePerThousand + gasFee are read from the aggregator contract (the value
  // the on-chain FeeMismatch check enforces) — NOT caller params. See fetchAggregatorFees.
  /** The committed notes tree (omit when `supplied` is set). */
  notesTree?: MerkleTree;
  /** Lean-client alternative: pre-built inclusion proofs at one root. */
  supplied?: SuppliedInclusionProofs;
  /** Network whose deployed aggregator/circuit to target; defaults to the active network. */
  networkSlug?: string;
}>;

/**
 * Build a submit-ready AGGREGATION proof from committed notes. Resolves the
 * network's circuit dimensions + artifacts, resolves recipients (handles get real
 * stealth delivery), proves locally, and decodes the post-state. The returned
 * {@link AggregatorSubmission} is plain data with `.submit()` / `.relay()` sugar.
 *
 * @example
 * const req = await buildAggregateRequest({ inputNotes, ownerBjjPrivateKeyHex,
 *   recipients: [{ amount: 5n, curvyId: "alice.curvy.name" }] });
 * await req.submit({ walletClient });   // or: await req.relay();
 */
export async function buildAggregateRequest(
  parameters: BuildAggregateRequestParameters,
): Promise<SubmittableSubmission> {
  const config = resolveConfig(parameters.config);
  const networkSlug = parameters.networkSlug ?? config.state.activeNetworks[0]?.slug;
  if (!networkSlug) throw new Error("buildAggregateRequest: no active network to target");

  const artifacts = resolveCircuitArtifacts(config, "aggregation", networkSlug);
  const { maxInputs, maxOutputs, treeDepth } = artifacts;
  // Read the fee config + fee-note key from the contract so the witness matches what the
  // contract enforces on-chain (protocolFee equality, gas-fee root match, fee-note key). The
  // per-token table and root are read and cross-checked at one pinned block (see fetchAggregatorFees).
  const { protocolFeePerThousand, feeNotePublicKey, commitmentGasCosts } = await fetchAggregatorFees(
    config,
    networkSlug,
  );

  const token = parameters.inputNotes[0].token;
  // Per-token batch gas fee: gasFee = table[token]; rebuild the gas-fee tree from the full table
  // so the proof's root matches the aggregator's `commitmentFeeRoot`.
  const tokenGasFee = commitmentGasCosts[Number(token)] ?? 0n;
  const gasFeeTree = MerkleTree.fromOrderedLeaves({ depth: GAS_FEE_TREE_DEPTH }, commitmentGasCosts);
  const recipientNotes = await resolveRecipients(config, parameters.recipients, token);
  // Operator gas-reimbursement note: an ordinary stealth recipient (so the operator
  // can DISCOVER + spend it), added as an extra output. This is what the relayer's
  // paymaster gate decrypts and amount-checks. It consumes one maxOutputs slot.
  let operatorNote: Note | undefined;
  if (parameters.operatorRecipient && parameters.operatorFee && parameters.operatorFee > 0n) {
    [operatorNote] = await resolveRecipients(
      config,
      [{ amount: parameters.operatorFee, publicKeys: parameters.operatorRecipient }],
      token,
    );
    recipientNotes.push(operatorNote);
  }
  // Stealth-deliver the change note back to the sender (discoverable on rescan).
  const { changeRecipient } = parameters;
  const sealChange = changeRecipient
    ? (amount: bigint) =>
        config.core.sendNote(changeRecipient.S, changeRecipient.V, {
          ownerBabyJubjubPublicKey: changeRecipient.babyJubjubPublicKey,
          amount,
          token,
        })
    : undefined;
  // Resolve the protocol fee collector: caller-provided `feeRecipient` wins, otherwise the
  // protocol-global `feeCollector` (from GET /protocol). When a fee is actually charged the
  // resolved key MUST equal the aggregator's on-chain `feeNotePublicKey` — otherwise the sealed
  // fee note would be owned by the wrong key (and the witness builder refuses to mint an
  // uncollectable fee note when none resolves).
  const feeRecipient = parameters.feeRecipient ?? config.state.protocol?.feeCollector;
  if ((protocolFeePerThousand > 0n || tokenGasFee > 0n) && feeRecipient) {
    const [feeX, feeY] = feeRecipient.babyJubjubPublicKey.split(".");
    if (BigInt(feeX) !== feeNotePublicKey[0] || BigInt(feeY) !== feeNotePublicKey[1]) {
      throw new Error(
        "buildAggregateRequest: fee-collector key mismatch — feeRecipient.babyJubjubPublicKey does not equal the " +
          "aggregator's on-chain feeNotePublicKey. Ensure the network's fee-collector config matches the deployed key.",
      );
    }
  }
  // Stealth-deliver the protocol fee note to the fee collector (so it's spendable).
  const sealFee = feeRecipient
    ? (amount: bigint) =>
        config.core.sendNote(feeRecipient.S, feeRecipient.V, {
          ownerBabyJubjubPublicKey: feeRecipient.babyJubjubPublicKey,
          amount,
          token,
        })
    : undefined;
  const { witness, outputNotes, feeNote } = await buildAggregationWitnessBundle({
    inputNotes: parameters.inputNotes,
    ownerBjjPrivateKeyHex: parameters.ownerBjjPrivateKeyHex,
    recipientNotes,
    feeNotePublicKey,
    protocolFeePerThousand,
    gasFee: tokenGasFee,
    gasFeeTree,
    notesTree: parameters.notesTree,
    supplied: parameters.supplied,
    sealChange,
    sealFee,
    maxInputs,
    maxOutputs,
    treeDepth,
  });

  const { proof, publicSignals } = await loadArtifactsAndProve(
    config,
    artifacts,
    flattenAggregationCircuitInputs(witness),
  );
  const signals = publicSignals.map(BigInt);

  return attachSubmissionSugar(config, {
    action: "aggregation",
    networkSlug,
    contractArg: maxInputs,
    maxOutputs,
    proof: formatGroth16ProofForSolidity(proof),
    publicSignals: signals,
    nullifiers: signals.slice(0, maxInputs),
    // Include fee note id alongside regular outputs so callers commit all PendingNotes
    // emitted by the aggregator. Contract layout: maxOutputs regular ids followed by fee id.
    outputNoteIds: signals.slice(maxInputs, maxInputs + maxOutputs + 1),
    outputNotes,
    feeNote,
    operatorNote,
  });
}

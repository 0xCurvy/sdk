import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyPublicKeys } from "@/core/types";
import { CommandError } from "@/errors";
import type { Note } from "@/note";
import type { SuppliedInclusionProofs } from "@/proving";
import { GAS_FEE_TREE_DEPTH, MerkleTree } from "@/proving";
import { formatGroth16ProofForSolidity } from "@/proving/groth16";
import { buildAggregationWitnessBundle, flattenAggregationCircuitInputs } from "@/proving/witnessFromNotes";
import { loadArtifactsAndProve } from "../proving/internal/loadArtifactsAndProve";
import { resolveCircuitArtifacts } from "../proving/internal/resolveCircuitArtifacts";
import { attachSubmissionSugar } from "./internal/attachSugar";
import { fetchAggregatorFees } from "./internal/fetchAggregatorFees";
import { resolveRecipients } from "./internal/resolveRecipients";
import type { AggregateRecipientInput, SubmittableSubmission } from "./types";

export type BuildAggregateRequestParameters = WithConfig<{
  /** One to `maxInputs` committed notes with the same token and owner. */
  inputNotes: Note[];
  /** BabyJubjub private key (hex) that owns the input notes and signs the aggregation. */
  ownerBjjPrivateKeyHex: string;
  /** Recipient outputs. The builder adds change and protocol-fee notes. */
  recipients: AggregateRecipientInput[];
  /**
   * Sender keys used to make a non-zero change note discoverable. Required when
   * the inputs can exceed recipients plus fees.
   */
  changeRecipient?: CurvyPublicKeys;
  /**
   * Protocol fee-collector keys. Defaults to protocol metadata and must match
   * the deployed aggregator when the fee is non-zero.
   */
  feeRecipient?: CurvyPublicKeys;
  /**
   * Relay operator keys. Together with `operatorFee`, adds a discoverable gas
   * reimbursement output and consumes one output slot.
   */
  operatorRecipient?: CurvyPublicKeys;
  /** The gas-reimbursement amount (token base units) for the {@link operatorRecipient} note. */
  operatorFee?: bigint;
  /** The committed notes tree (omit when `supplied` is set). */
  notesTree?: MerkleTree;
  /** Lean-client alternative: pre-built inclusion proofs at one root. */
  supplied?: SuppliedInclusionProofs;
  /** Network whose deployed aggregator/circuit to target; defaults to the active network. */
  networkSlug?: string;
}>;

/**
 * Build a submit-ready aggregation proof from committed notes. Contract fees and
 * circuit parameters are read for the selected network; proving runs locally.
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
  if (!networkSlug) {
    throw new CommandError("Select an active network before building an aggregation.", "aggregator-aggregate");
  }

  const artifacts = resolveCircuitArtifacts(config, "aggregation", networkSlug);
  const { maxInputs, maxOutputs, treeDepth } = artifacts;
  // Use one contract-pinned fee snapshot for the complete witness.
  const { protocolFeePerThousand, feeNotePublicKey, commitmentGasCosts } = await fetchAggregatorFees(
    config,
    networkSlug,
  );

  const token = parameters.inputNotes[0].token;
  // The circuit proves both the selected token fee and the complete fee-table root.
  const tokenGasFee = commitmentGasCosts[Number(token)] ?? 0n;
  const gasFeeTree = MerkleTree.fromOrderedLeaves({ depth: GAS_FEE_TREE_DEPTH }, commitmentGasCosts);
  const recipientNotes = await resolveRecipients(config, parameters.recipients, token);
  // The relay reimbursement is an ordinary discoverable output note.
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
  // The metadata key must match the key committed by the deployed aggregator.
  const feeRecipient = parameters.feeRecipient ?? config.state.protocol?.feeCollector;
  if ((protocolFeePerThousand > 0n || tokenGasFee > 0n) && feeRecipient) {
    const [feeX, feeY] = feeRecipient.babyJubjubPublicKey.split(".");
    if (BigInt(feeX) !== feeNotePublicKey[0] || BigInt(feeY) !== feeNotePublicKey[1]) {
      throw new CommandError(
        "The configured fee-collector key does not match the selected network's aggregator contract.",
        "aggregator-aggregate",
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

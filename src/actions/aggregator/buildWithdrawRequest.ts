import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { CommandError } from "@/errors";
import type { Note } from "@/note";
import type { MerkleTree, SuppliedInclusionProofs } from "@/proving";
import { formatGroth16ProofForSolidity } from "@/proving/groth16";
import { flattenWithdrawalCircuitInputs, generateWithdrawalCircuitInputsFromNotes } from "@/proving/witnessFromNotes";
import { loadArtifactsAndProve } from "../proving/internal/loadArtifactsAndProve";
import { resolveCircuitArtifacts } from "../proving/internal/resolveCircuitArtifacts";
import { attachSubmissionSugar } from "./internal/attachSugar";
import type { SubmittableSubmission } from "./types";

export type BuildWithdrawRequestParameters = WithConfig<{
  /** One to `maxInputs` committed notes with the same token and owner. */
  notes: Note[];
  /** BabyJubjub private key (hex) that owns the notes and signs the withdrawal. */
  ownerBjjPrivateKeyHex: string;
  /** Destination EOA the vault pays out to (as a bigint address). */
  destinationAddress: bigint;
  /** The token to withdraw (must match every input note). */
  tokenId: bigint;
  /** The committed notes tree (omit when `supplied` is set). */
  notesTree?: MerkleTree;
  /** Lean-client alternative: pre-built inclusion proofs at one root. */
  supplied?: SuppliedInclusionProofs;
  /** Network whose deployed aggregator/circuit to target; defaults to the active network. */
  networkSlug?: string;
}>;

/**
 * Build a submit-ready withdrawal proof from committed notes. Proving runs
 * locally; the result can be submitted by wallet or relay.
 *
 * @example
 * const w = await buildWithdrawRequest({ notes, ownerBjjPrivateKeyHex, destinationAddress, tokenId: 1n });
 * await w.submit({ walletClient });
 */
export async function buildWithdrawRequest(parameters: BuildWithdrawRequestParameters): Promise<SubmittableSubmission> {
  const config = resolveConfig(parameters.config);
  const networkSlug = parameters.networkSlug ?? config.state.activeNetworks[0]?.slug;
  if (!networkSlug) {
    throw new CommandError("Select an active network before building a withdrawal.", "aggregator-withdraw");
  }

  // Reject values that would be truncated by `address(uint160(...))` on-chain.
  const { destinationAddress } = parameters;
  if (destinationAddress < 0n || destinationAddress >= 1n << 160n) {
    throw new CommandError("The withdrawal destination must be a valid 160-bit EVM address.", "aggregator-withdraw");
  }

  const artifacts = resolveCircuitArtifacts(config, "withdrawal", networkSlug);
  const { maxInputs, treeDepth } = artifacts;

  const witness = await generateWithdrawalCircuitInputsFromNotes({
    notes: parameters.notes,
    ownerBjjPrivateKeyHex: parameters.ownerBjjPrivateKeyHex,
    notesTree: parameters.notesTree,
    supplied: parameters.supplied,
    destinationAddress,
    tokenId: parameters.tokenId,
    maxInputs,
    treeDepth,
  });

  const { proof, publicSignals } = await loadArtifactsAndProve(
    config,
    artifacts,
    flattenWithdrawalCircuitInputs(witness),
  );
  const signals = publicSignals.map(BigInt);

  return attachSubmissionSugar(config, {
    action: "withdrawal",
    networkSlug,
    contractArg: maxInputs,
    proof: formatGroth16ProofForSolidity(proof),
    publicSignals: signals,
    // publicSignals = [withdrawnAmount, nullifiers..., notesRoot, destinationAddress, tokenId]
    // withdrawnAmount = GROSS input total; the contract subtracts gasFee + protocolFee before paying out.
    withdrawnAmount: signals[0],
    nullifiers: signals.slice(1, 1 + maxInputs),
  });
}

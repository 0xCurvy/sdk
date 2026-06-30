import type { TransactionReceipt, WalletClient } from "viem";
import type { Note } from "@/note";
import type { SolidityProof } from "@/proving/groth16";
import type { AggregatorSubmissionAction, RelaySubmitReturnType } from "@/types/aggregator";
import type { CurvyPublicKeys } from "@/types/core";
import type { HexString } from "@/types/helper";

/**
 * A recipient of an aggregation output, accepted by the builders in three forms:
 *  - a Curvy handle (`curvyId`)        — resolved + stealth-delivered for you
 *  - explicit recipient `publicKeys`   — same, without the handle lookup
 *  - a raw stealth tuple               — you already ran ECDH (tests / self-notes)
 * The first two produce a DISCOVERABLE note (real ECDH stealth delivery via
 * `core.sendNote`); the raw form uses a random ephemeral key (undiscoverable).
 */
export type AggregateRecipientInput =
  | { amount: bigint; curvyId: string }
  | { amount: bigint; publicKeys: CurvyPublicKeys }
  | { amount: bigint; ownerPub: [bigint, bigint]; sharedSecret: bigint };

/** Where a built submission is sent. */
export type SubmitVia = { kind: "wallet"; walletClient: WalletClient; contractAddress?: HexString } | { kind: "relay" };

/** Result of `submitToChain` / `submission.submit(...)`. */
export type ChainSubmitResult = { transactionHash: HexString; receipt: TransactionReceipt };

/**
 * A finished, submit-ready aggregator proof plus its decoded post-state.
 *
 * This is PLAIN, SERIALIZABLE DATA — safe to `structuredClone`, `postMessage` to a
 * worker, or persist. It has no methods. The `build*Request` actions return a
 * {@link SubmittableSubmission} (this data + `.submit()` / `.relay()` sugar); after
 * a structured clone you are back to a bare `AggregatorSubmission` and use the
 * `submitToChain` / `relaySubmission` free actions instead.
 */
export type AggregatorSubmission = {
  /** Which contract entry point this targets. */
  action: AggregatorSubmissionAction;
  /** Network slug the proof is for; resolves the contract address + chain at submit time. */
  networkSlug: string;
  /** The contract's leading arg: `maxInputs` for aggregation/withdrawal. */
  contractArg: number;
  /**
   * Aggregation only: the circuit's `maxOutputs`. The contract's
   * `submitAggregationRequest(maxInputs, maxOutputs, …)` needs BOTH dimensions to
   * select the verifier and validate the publicSignals length. Undefined for
   * withdrawal (whose entry point takes `maxInputs` alone).
   */
  maxOutputs?: number;
  /** The groth16 proof, G2-swapped + ready for the verifier ABI. */
  proof: SolidityProof;
  /** All public signals (bigints), in the verifier's declared order. */
  publicSignals: bigint[];

  // ── decoded conveniences (so you never re-slice publicSignals by hand) ──
  /** Spent-note nullifiers (aggregation + withdrawal). */
  nullifiers?: bigint[];
  /** New output note ids (aggregation). */
  outputNoteIds?: bigint[];
  /** The new PENDING output notes — COMMIT them before they can be spent (aggregation). */
  outputNotes?: Note[];
  /** The protocol fee note (aggregation). */
  feeNote?: Note;
  /**
   * The operator gas-reimbursement note (aggregation), present only when the
   * request was built with an `operatorRecipient`. This is the note the relayer's
   * paymaster gate decrypts + amount-checks; it is also one of `outputNotes`.
   */
  operatorNote?: Note;
  /**
   * GROSS withdrawn total = sum of the input-note amounts (withdrawal) = publicSignals[0].
   * NOT the net payout: the contract deducts `gasFee` + `protocolFeePerThousand`, so the
   * destination receives `withdrawnAmount - gasFee - floor(withdrawnAmount * protocolFeePerThousand / 1000)`.
   */
  withdrawnAmount?: bigint;
};

/**
 * What the `build*Request` actions return: an {@link AggregatorSubmission} plus the
 * `.submit()` / `.relay()` chaining sugar. The methods are NON-ENUMERABLE closures,
 * so `JSON.stringify` / `structuredClone` still round-trip the data (and drop the
 * methods, leaving a plain `AggregatorSubmission`).
 */
export type SubmittableSubmission = AggregatorSubmission & {
  /** Submit on-chain with the user's own wallet client (the user is the sender + pays gas). */
  submit: (opts: { walletClient: WalletClient; contractAddress?: HexString }) => Promise<ChainSubmitResult>;
  /** Relay via the SDK's service. Returns immediately ({ status: "queued" }); poll with `waitForRelay`. */
  relay: () => Promise<RelaySubmitReturnType>;
};

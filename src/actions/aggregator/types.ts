import type { TransactionReceipt, WalletClient } from "viem";
import type { CurvyPublicKeys } from "@/core/types";
import type { Note } from "@/note";
import type { SolidityProof } from "@/proving/groth16";
import type { AggregatorSubmissionAction, RelaySubmitReturnType } from "@/types/aggregator";
import type { HexString } from "@/types/helper";

/**
 * Recipient input accepted by `buildAggregateRequest`. Prefer a Curvy id,
 * explicit public keys, or a pre-built note. The raw owner tuple is intended for
 * callers that already manage note delivery data.
 */
export type AggregateRecipientInput =
  | { amount: bigint; curvyId: string }
  | { amount: bigint; publicKeys: CurvyPublicKeys }
  | { note: Note }
  | { amount: bigint; ownerPub: [bigint, bigint]; sharedSecret: bigint };

/** Where a built submission is sent. */
export type SubmitVia = { kind: "wallet"; walletClient: WalletClient; contractAddress?: HexString } | { kind: "relay" };

/** Result of `submitToChain` / `submission.submit(...)`. */
export type ChainSubmitResult = { transactionHash: HexString; receipt: TransactionReceipt };

/**
 * A finished, submit-ready aggregator proof plus its decoded post-state.
 *
 * Its enumerable fields are serializable and can cross a worker boundary. The
 * builder result also has non-enumerable `submit` and `relay` convenience methods;
 * use the free submission actions after serialization.
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

  // Decoded values from the ordered public signals.
  /** Spent-note nullifiers (aggregation + withdrawal). */
  nullifiers?: bigint[];
  /** New output note ids (aggregation). */
  outputNoteIds?: bigint[];
  /** New output notes; they become spendable after commitment. */
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
 * `.submit()` / `.relay()` convenience methods. They are non-enumerable and are
 * intentionally dropped by serialization.
 */
export type SubmittableSubmission = AggregatorSubmission & {
  /** Submit on-chain with the user's own wallet client (the user is the sender + pays gas). */
  submit: (opts: { walletClient: WalletClient; contractAddress?: HexString }) => Promise<ChainSubmitResult>;
  /** Relay via the SDK's service. Returns immediately ({ status: "queued" }); poll with `waitForRelay`. */
  relay: () => Promise<RelaySubmitReturnType>;
};

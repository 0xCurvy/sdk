import type { InputNote, OutputNote } from "@/note";
import type { ExtractValues, HexString } from "@/types/helper";
import type { CurvyPublicKeys, Signature } from "./core";

type AggregationRequest = {
  inputNotes: InputNote[];
  outputNotes: OutputNote[];
  signature: Signature;
  networkId: number;
};

type WithdrawRequest = {
  inputNotes: InputNote[];
  signature: Signature;
  destinationAddress: HexString;
  networkId: number;
};

export type { AggregationRequest, WithdrawRequest };

const AGGREGATOR_ACTIONS = {
  DEPOSIT: "deposit",
  AGGREGATION: "aggregation",
  WITHDRAWAL: "withdrawal",
  FEE_WITHDRAWAL: "fee-withdrawal",
} as const;
type AGGREGATOR_ACTIONS = typeof AGGREGATOR_ACTIONS;
export { AGGREGATOR_ACTIONS };
export type AggregatorAction = ExtractValues<AGGREGATOR_ACTIONS>;

export type AggregatorRequestStatus = "pending" | "success";

// ─────────────────────────────────────────────────────────────────────────────
// Client-proved submission + relay wire contract (the v3 DX path).
//
// Unlike the legacy `AggregationRequest`/`WithdrawRequest` above (where the client
// hands the backend NOTES and the backend proves), these carry a FINISHED proof:
// the client proves locally, then either submits the proof itself or relays it.
//
// The RELAY contract is SDK-OWNED and backend-agnostic: the SDK defines this exact
// request/response wire shape; whatever service relays implements it. No backend
// types are imported here, so a backend rewrite can't break the SDK. The relay is
// ANONYMOUS — the on-chain verifier is the only gate, so the proof self-authenticates.
// ─────────────────────────────────────────────────────────────────────────────

/** Which aggregator entry point a client-proved submission targets. */
export type AggregatorSubmissionAction = "aggregation" | "withdrawal";

/** A groth16 proof as JSON-safe decimal strings (bigints don't survive `JSON.stringify`). */
export type RelayProofPayload = {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
};

/**
 * The body POSTed to relay a client-proved submission. `publicSignals` is an
 * ORDERED, OPAQUE string[] — never a fixed-length tuple — because its length
 * varies per action/circuit and changes as circuits evolve; the on-chain verifier
 * enforces correctness, not this shape.
 */
export type RelaySubmitRequestBody = {
  action: AggregatorSubmissionAction;
  networkId: number;
  /** The aggregator config arg (e.g. maxInputs). */
  maxInputs: number;
  proof: RelayProofPayload;
  publicSignals: string[];
  /**
   * Client-derived (hash of the first nullifier) so a POST retry maps to the SAME
   * relayed tx instead of double-submitting. The relayer MUST honor it.
   */
  idempotencyKey: string;
};

/** Lifecycle of a relayed submission (richer than the legacy pending/success). */
export type RelaySubmissionStatus = "queued" | "submitting" | "finalized" | "failed";

/** Relay response — includes `transactionHash` so the user can verify their own submission. */
export type RelaySubmitReturnType = {
  requestId: string;
  status: RelaySubmissionStatus;
  transactionHash?: HexString;
  blockNumber?: string;
  networkId?: number;
  error?: string;
};

/**
 * Paymaster discovery (`GET /relay/paymaster`). The operator runs a paymaster:
 * it pays the on-chain gas for `submitAggregationRequest` and is reimbursed by a
 * dedicated output note addressed to {@link operator}. The SDK reads this to (1)
 * learn the operator's keys so it can address the note, and (2) size the note
 * from the operator's OWN current gas view, which keeps the client's estimate
 * close to what the relayer will enforce (shrinking the price-drift window).
 *
 * This is plain info — NOT a signed quote. The relayer re-checks at submit time
 * against live prices with a downward {@link relayerToleranceBps}, and the SDK
 * over-provisions by {@link clientBufferBps}, so normal drift never refuses a
 * fairly-priced request.
 */
export type PaymasterInfo = {
  /** The operator's public keys — address the gas-reimbursement note here. */
  operator: CurvyPublicKeys;
  /** Accepted token vault ids (decimal strings). `null` = every token accepted. */
  acceptedVaultTokenIds: string[] | null;
  /** The operator's current gas-unit estimate for `submitAggregationRequest`. */
  submitAggregationGasUnits: string;
  /** The operator's current native gas price (wei, decimal). */
  gasPriceWei: string;
  /** Recommended over-provision the SDK should add when sizing the note (basis points). */
  clientBufferBps: number;
  /** Downward allowance the relayer applies when validating (basis points). */
  relayerToleranceBps: number;
};

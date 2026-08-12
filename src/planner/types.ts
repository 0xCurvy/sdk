import type { CurvyError } from "@/errors.js";
import type { Note } from "@/note/note.js";
import type { InputFinalityPolicy } from "@/storage/types.js";
import type { CurvyId } from "@/types/curvy.js";
import type { HexString } from "@/types/helper.js";
import type { BalanceEntry, Currency, CurvyPublicKeys, GenericBalanceEntry, Network } from "@/types/index.js";

export type CommandKind = "aggregator-aggregate" | "aggregator-withdraw";

export type PlanStepKind = CommandKind | "wait";

/** Safe progress metadata; note data and prepared execution state are excluded. */
export type PlanStep = {
  id: string;
  kind: PlanStepKind;
  label: string;
  index: number;
  total: number;
};

/**
 * Opaque execution handle returned by `estimateIntent`.
 *
 * It is intentionally non-serializable: prepared proofs and bearer note data
 * remain in SDK memory and are not exposed through this object.
 */
export type PreparedIntent = {
  readonly id: string;
  readonly steps: readonly PlanStep[];
};

export interface CommandEstimate {
  curvyFeeInCurrency: bigint;
  gasFeeInCurrency: bigint;
  bridgeFeeInCurrency?: bigint;
  bridgeEstimateAmount?: string;
  deliveredAmount?: bigint;
  totalFeeInCurrency?: bigint;
  degradedToFeesOnAmount?: boolean;
}

export type GiftIntentOutput = {
  kind: "gift";
  /** Bearer note material. Treat as sensitive and include only in the gift link. */
  note: Note;
};

export type IntentOutput = GiftIntentOutput;

export type BaseIntent = {
  amount: bigint;
  currency: Currency;
  network: Network;
  /** Per-intent override; account preference/product default applies when omitted. */
  inputFinalityPolicy?: InputFinalityPolicy;
};

export type TransferIntent = BaseIntent & {
  type: "curvy-transfer";
  recipient: CurvyId;
  recipientPublicKeys?: never;
};

export type SwapIntent = BaseIntent & {
  type: "curvy-swap";
  recipient: HexString;
  recipientPublicKeys?: never;
  entryAddress: HexString;
  exitCurrency: Currency;
};

export type ExternalTransferIntent = BaseIntent & {
  type: "external-transfer";
  recipient: HexString;
  exitNetwork?: Network;
  exitAddress?: HexString | (string & {});
  exitCurrency?: Currency;
  recipientPublicKeys?: never;
};

export type SendToAnyoneIntent = BaseIntent & {
  type: "send-to-anyone";
  recipient?: never;
  recipientPublicKeys: CurvyPublicKeys;
};

export type Intent = TransferIntent | SwapIntent | ExternalTransferIntent | SendToAnyoneIntent;

// --- Command variants ---

export type DraftCommand = {
  type: "command";
  id: string;
  kind: CommandKind;
  intent?: Intent;
};

export type EstimatedCommand = DraftCommand & {
  estimate: CommandEstimate;
  /** Opaque command state required for execution. Do not log or persist it. */
  execution?: unknown;
};

/** Normalized private-note inputs passed between commands. */
export type CommandData<T extends GenericBalanceEntry = BalanceEntry> = T[];

/** A delivered amount that has left the sender's private-note set. */
export type DeliveredPlanValue = {
  kind: "delivered";
  amount: bigint;
  networkSlug: string;
  currencyAddress: HexString;
};

export type PlanValue = CommandData | DeliveredPlanValue;

// --- Plan node types ---

export type PlanData = {
  type: "data";
  data: CommandData;
};

export type PlanWait = {
  type: "wait";
  id: string;
  name: string;
  condition: {
    kind: "contract-code";
    networkSlug: string;
    address: HexString;
    /** Optional delay after code appears while the destination transaction settles. */
    settleDelayMs?: number;
  };
};

export type PlanFlowControl<C extends DraftCommand = DraftCommand> = {
  type: "parallel" | "serial";
  name?: string;
  description?: string;
  items: Plan<C>[];
};

// --- Composite plan types ---

export type Plan<C extends DraftCommand = DraftCommand> = PlanFlowControl<C> | C | PlanData | PlanWait;

export type DraftPlan = Plan;
export type EstimatedPlan = Plan<EstimatedCommand>;

export const isPlanFlowControl = <C extends DraftCommand>(plan: Plan<C>): plan is PlanFlowControl<C> =>
  plan.type === "parallel" || plan.type === "serial";

export type GeneratePlanReturnType = {
  plan: DraftPlan;
  usedBalances: BalanceEntry[];
};

// --- Plan result types ---

export type PlanSuccess<TPreparedPlan = never> = {
  success: true;
  preparedPlan?: TPreparedPlan;
  estimate?: CommandEstimate;
  data?: PlanValue;
  output?: IntentOutput;
  items?: PlanResult<TPreparedPlan>[];
};

export type PlanFailure<TPreparedPlan = never> = {
  success: false;
  error: CurvyError;
  items?: PlanResult<TPreparedPlan>[];
};

export type PlanResult<TPreparedPlan = never> = PlanSuccess<TPreparedPlan> | PlanFailure<TPreparedPlan>;
export type PlanEstimation = PlanResult<EstimatedPlan>;
export type PlanExecution = PlanResult;
export type PlanSuccessfulEstimation = PlanSuccess<EstimatedPlan>;
export type PlanUnsuccessfulEstimation = PlanFailure<EstimatedPlan>;
export type PlanSuccessfulExecution = PlanSuccess;
export type PlanUnsuccessfulExecution = PlanFailure;

export type IntentEstimation = {
  prepared: PreparedIntent;
  /** @deprecated Pass `prepared` to `executeIntent`. Kept for existing monorepo integrations. */
  plan: EstimatedPlan;
  usedBalances: BalanceEntry[];
  gas: bigint;
  curvyFee: bigint;
  effectiveAmount: bigint;
  /** The requested amount could not be delivered in full after protocol/submission fees. */
  degradedToFeesOnAmount: boolean;
  bridgeFee?: bigint;
  inputFinalityPolicy: InputFinalityPolicy;
  output?: IntentOutput;
};

import type { CurvyCommandEstimate } from "@/planner/commands/abstract.js";
import type { CurvyId } from "@/types/curvy.js";
import type { HexString } from "@/types/helper.js";
import type { BalanceEntry, Currency, CurvyPublicKeys, Network } from "@/types/index.js";

export type CurvyBaseIntent = {
  amount: bigint;
  currency: Currency;
  network: Network;
};

export type CurvyTransferIntent = CurvyBaseIntent & {
  type: "curvy-transfer";
  recipient: CurvyId;
  recipientPublicKeys?: never;
};

export type CurvySwapIntent = CurvyBaseIntent & {
  type: "curvy-swap";
  recipient: HexString;
  recipientPublicKeys?: never;
  entryAddress: HexString;
  exitCurrency: Currency;
};

export type ExternalTransferIntent = CurvyBaseIntent & {
  type: "external-transfer";
  recipient: HexString;
  exitNetwork?: Network;
  recipientPublicKeys?: never;
};

export type SendToAnyoneIntent = CurvyBaseIntent & {
  type: "send-to-anyone";
  recipient?: never;
  recipientPublicKeys: CurvyPublicKeys;
};

export type CurvyIntent = CurvyTransferIntent | CurvySwapIntent | ExternalTransferIntent | SendToAnyoneIntent;

// --- Command variants ---

export type DraftCommand = {
  type: "command";
  id: string;
  name: string;
  intent?: CurvyIntent;
};

export type EstimatedCommand = DraftCommand & {
  estimate: CurvyCommandEstimate;
};

export type CurvyCommandData = BalanceEntry | BalanceEntry[];

// --- Plan node types ---

export type CurvyPlanData = {
  type: "data";
  data: CurvyCommandData;
};

export type CurvyPlanWait = {
  type: "wait";
  id: string;
  name: string;
  condition: () => Promise<boolean>;
};

export type CurvyPlanFlowControl<C extends DraftCommand = DraftCommand> = {
  type: "parallel" | "serial";
  name?: string;
  description?: string;
  items: CurvyPlan<C>[];
};

// --- Composite plan types ---

export type CurvyPlan<C extends DraftCommand = DraftCommand> =
  | CurvyPlanFlowControl<C>
  | C
  | CurvyPlanData
  | CurvyPlanWait;

export type DraftPlan = CurvyPlan;
export type EstimatedPlan = CurvyPlan<EstimatedCommand>;

export const isCurvyPlanFlowControl = <C extends DraftCommand>(plan: CurvyPlan<C>): plan is CurvyPlanFlowControl<C> =>
  plan.type === "parallel" || plan.type === "serial";

export type GeneratePlanReturnType = {
  plan: DraftPlan;
  usedBalances: BalanceEntry[];
};

// --- Estimation result types ---

export type CurvyPlanSuccessfulEstimation = {
  success: true;
  estimatedPlan: EstimatedPlan;
  estimate?: CurvyCommandEstimate;
  data?: CurvyCommandData;
  items?: CurvyPlanEstimation[];
};

export type CurvyPlanUnsuccessfulEstimation = {
  success: false;
  error: unknown;
  items?: CurvyPlanEstimation[];
};

export type CurvyPlanEstimation = CurvyPlanSuccessfulEstimation | CurvyPlanUnsuccessfulEstimation;

// --- Execution result types ---

export type CurvyPlanSuccessfulExecution = {
  success: true;
  data?: CurvyCommandData;
  items?: CurvyPlanExecution[];
  estimate?: CurvyCommandEstimate;
};

export type CurvyPlanUnsuccessfulExecution = {
  success: false;
  error: unknown;
  items?: CurvyPlanExecution[];
};

export type CurvyPlanExecution = CurvyPlanSuccessfulExecution | CurvyPlanUnsuccessfulExecution;

export type IntentEstimation = {
  plan: EstimatedPlan;
  usedBalances: BalanceEntry[];
  gas: bigint;
  curvyFee: bigint;
  effectiveAmount: bigint;
  bridgeFee?: bigint;
};

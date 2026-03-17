import type { CommandEstimate } from "@/planner/commands/abstract.js";
import type { CurvyId } from "@/types/curvy.js";
import type { HexString } from "@/types/helper.js";
import type { BalanceEntry, Currency, CurvyPublicKeys, GenericBalanceEntry, Network } from "@/types/index.js";

export type BaseIntent = {
  amount: bigint;
  currency: Currency;
  network: Network;
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
  name: string;
  intent?: Intent;
};

export type EstimatedCommand = DraftCommand & {
  estimate: CommandEstimate;
};

export type CommandData<T extends GenericBalanceEntry = BalanceEntry> = T | T[];

// --- Plan node types ---

export type PlanData = {
  type: "data";
  data: CommandData;
};

export type PlanWait = {
  type: "wait";
  id: string;
  name: string;
  condition: () => Promise<boolean>;
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

// --- Estimation result types ---

export type PlanSuccessfulEstimation = {
  success: true;
  estimatedPlan: EstimatedPlan;
  estimate?: CommandEstimate;
  data?: CommandData;
  items?: PlanEstimation[];
};

export type PlanUnsuccessfulEstimation = {
  success: false;
  error: unknown;
  items?: PlanEstimation[];
};

export type PlanEstimation = PlanSuccessfulEstimation | PlanUnsuccessfulEstimation;

// --- Execution result types ---

export type PlanSuccessfulExecution = {
  success: true;
  data?: CommandData;
  items?: PlanExecution[];
  estimate?: CommandEstimate;
};

export type PlanUnsuccessfulExecution = {
  success: false;
  error: unknown;
  items?: PlanExecution[];
};

export type PlanExecution = PlanSuccessfulExecution | PlanUnsuccessfulExecution;

export type IntentEstimation = {
  plan: EstimatedPlan;
  usedBalances: BalanceEntry[];
  gas: bigint;
  curvyFee: bigint;
  effectiveAmount: bigint;
  bridgeFee?: bigint;
};

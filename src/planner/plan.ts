import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { BalanceEntry, Currency, CurvyPublicKeys, Network } from "@/types";
import type { CurvyHandle } from "@/types/curvy";
import type { HexString } from "@/types/helper";

export type CurvyIntent = {
  amount: bigint;

  // I don't care that Currency and Network are large objects, intents are rare and always user-generated.
  currency: Currency;
  network: Network;
} & (
  | {
      type: "curvy-transfer";
      recipient: CurvyHandle;
      recipientPublicKeys?: never;
    }
  | {
      type: "external-transfer" | "curvy-swap";
      recipient: HexString;
      targetCurrency?: string;
      recipientPublicKeys?: never;
    }
  | {
      type: "send-to-anyone";
      recipient?: never;
      recipientPublicKeys: CurvyPublicKeys;
    }
);

export type CurvyPlanCommandState = "estimated" | "pending" | "executed" | "failed";

export type CurvyPlanCommand = {
  type: "command";
  id: string;
  name: string;
  // Attached to command nodes in estimation phase and used in execute phase
  estimate?: CurvyCommandEstimate;
  // Some commands require access to users intent (e.g. recipient address, amount etc)
  intent?: CurvyIntent;
  state?: CurvyPlanCommandState;
  output?: CurvyCommandData;
};

export type CurvyCommandData = BalanceEntry | BalanceEntry[];

export type CurvyPlanData = {
  type: "data";
  data: CurvyCommandData;
};

export type GeneratePlanReturnType = {
  plan: CurvyPlan;
  usedBalances: BalanceEntry[];
};

export type CurvyPlanFlowControl = {
  type: "parallel" | "serial";
  items: CurvyPlan[];
};

export type CurvyPlan = CurvyPlanFlowControl | CurvyPlanCommand | CurvyPlanData;
export const isCurvyPlanFlowControl = (plan: CurvyPlan): plan is CurvyPlanFlowControl =>
  plan.type === "parallel" || plan.type === "serial";

export type CurvyPlanSuccessfulEstimation = {
  success: true;
  result: CurvyCommandEstimate;
  items?: CurvyPlanEstimation[];
};

export type CurvyPlanUnsuccessfulEstimation = {
  success: false;
  error: any;
};

export type CurvyPlanEstimation = CurvyPlanSuccessfulEstimation | CurvyPlanUnsuccessfulEstimation;

export type CurvyPlanSuccessfulExecution = {
  success: true;
  data?: CurvyCommandData;
  items?: CurvyPlanExecution[];
  // Available only in estimatePlan response
  estimate?: CurvyCommandEstimate;
};

export type CurvyPlanUnsuccessfulExecution = {
  success: false;
  error: any;
  items?: CurvyPlanExecution[];
};

export type CurvyPlanExecution = CurvyPlanSuccessfulExecution | CurvyPlanUnsuccessfulExecution;

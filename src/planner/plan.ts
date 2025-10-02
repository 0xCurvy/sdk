import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { BalanceEntry } from "@/types";
import type { Currency, Network } from "@/types/api";
import type { CurvyHandle } from "@/types/curvy";
import type { HexString } from "@/types/helper";

export interface CurvyIntent {
  amount: bigint;
  toAddress: CurvyHandle | HexString;
  // I don't care that Currency and Network are large objects, intents are rare and always user-generated.
  currency: Currency;
  network: Network;
}

export type CurvyPlanCommand = {
  type: "command";
  name: string;
  // Some commands such as WithdrawFromCSUC and SendToEOA require an intent.
  // Intent is not passed in commands where the `to` address is a new CSUC/Note/SA of the current user, e.g. the OnboardToCSUCCommand.
  intent?: CurvyIntent;
};

export type CurvyCommandData = BalanceEntry | BalanceEntry[];

export type CurvyPlanData = {
  type: "data";
  data: CurvyCommandData;
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
};

export type CurvyPlanUnsuccessfulExecution = {
  success: false;
  error: any;
  items?: CurvyPlanExecution[];
};

export type CurvyPlanExecution = CurvyPlanSuccessfulExecution | CurvyPlanUnsuccessfulExecution;

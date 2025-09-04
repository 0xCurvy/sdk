import type { Currency, Network } from "@/types/api";
import type { CurvyHandle } from "@/types/curvy";
import type { HexString } from "@/types/helper";
import { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CurvyCommandInput } from "@/planner/addresses/abstract";

// TODO: [Vanja] Reimplement CurvyAddress with balances
// Curvy Address is tied to one currency and one network
// TODO: Find a better name, CurvyAddress is already taken
export type CurvyAddressLike = {
  address: string;
  type: "sa" | "note" | "csuc";
  balance: bigint;
  privateKey: string;
};

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
  // Some commands (such as aggregate) can spend less than they have available. That's what we use this amount for.
  amount?: bigint
};

export type CurvyPlanInput = {
  type: "input";
  input: CurvyCommandInput;
};

export type CurvyPlanFlowControl = {
  type: "parallel" | "serial";
  items: CurvyPlan[];
};

export type CurvyPlan = CurvyPlanFlowControl | CurvyPlanCommand | CurvyPlanInput;

export type CurvyPlanSuccessfulEstimation = {
  success: true;
  result: CurvyCommandEstimate;
  items?: CurvyPlanEstimation[];
};

export type CurvyPlanUnsuccessfulEstimation = {
  success: false;
  error: any;
};

export type CurvyPlanEstimation =
  | CurvyPlanSuccessfulEstimation
  | CurvyPlanUnsuccessfulEstimation;

export type CurvyPlanSuccessfulExecution = {
  success: true;
  address?: CurvyAddressLike;
  items?: CurvyPlanExecution[];
};

export type CurvyPlanUnsuccessfulExecution = {
  success: false;
  error: any;
  items?: CurvyPlanExecution[];
};

export type CurvyPlanExecution =
  | CurvyPlanSuccessfulExecution
  | CurvyPlanUnsuccessfulExecution;

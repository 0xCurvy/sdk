import type { CurvyCommandEstimate } from "@/planner/commands/interface";
import type { Currency, Network } from "@/types/api";
import type { CurvyHandle } from "@/types/curvy";
import type { HexString } from "@/types/helper";

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
  // Some commands such as WithdrawFromCSUC and SendToEOA require an intent
  // Intent is not passed in commands where the `to` address is a new CSUC/Note/SA of the current user, e.g. the OnboardToCSUCCommand.
  intent?: CurvyIntent;
  // All(?) commands require input. Input is a CurvyAddress object.
  // Input must be explicitly passed to the top-most CurvyWalletCommand
  // If it is undefined, then it will take the output of the previous CurvyPlanCommand/CurvyPlanStep as the input CurvyAddress.
  input?: CurvyAddressLike;
};

export type CurvyPlanAddress = {
  type: "address";
  address: CurvyAddressLike;
};

export type CurvyPlanFlowControl = {
  type: "parallel" | "serial";
  items: CurvyPlan[];
};

export type CurvyPlan = CurvyPlanFlowControl | CurvyPlanCommand | CurvyPlanAddress;

export type CurvyPlanSuccessfulEstimation = {
  success: true;
  result: CurvyCommandEstimate;
};

export type CurvyPlanUnsuccessfulEstimation = {
  success: false;
  error: Error;
};

export type CurvyPlanEstimationResult =
  | CurvyPlanSuccessfulEstimation
  | CurvyPlanUnsuccessfulEstimation
  // TODO: Do we need Arrays because of parallel in case of estimation?
  | (CurvyPlanSuccessfulEstimation | CurvyPlanUnsuccessfulEstimation)[];

export type CurvyPlanSuccessfulExecution = {
  success: true;
  output: CurvyAddressLike;
};

export type CurvyPlanUnsuccessfulExecution = {
  success: false;
  error: Error;
};

export type CurvyPlanExecutionResult =
  | CurvyPlanSuccessfulExecution
  | CurvyPlanUnsuccessfulExecution
  // Arrays because of parallel
  | (CurvyPlanSuccessfulExecution | CurvyPlanUnsuccessfulExecution)[];

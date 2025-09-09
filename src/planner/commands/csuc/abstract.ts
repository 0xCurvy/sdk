import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import type { CsucActionPayload, CsucBalanceEntry } from "@/types";

// This command automatically sends all available balance from CSUC to Aggregator
export abstract class CSUCAbstractCommand extends CurvyCommand {
  protected sdk: ICurvySDK;

  // CSUC address that will sign / auth. the action to be executed
  protected declare input: CsucBalanceEntry;

  // Payload that will be used for estimation / execution of the action
  protected actionPayload?: CsucActionPayload;

  // The inside CSUC total fee (in the currency being moved) that will be taken by Curvy
  protected totalFee: bigint;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent?: CurvyIntent) {
    super(sdk, input);
    this.sdk = sdk;
    this.totalFee = 0n;
  }

  // Assumes .estimate() has been called before it
  abstract execute(): Promise<CurvyCommandData>;

  abstract estimate(): Promise<CurvyCommandEstimate>;
}

import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyIntent } from "@/planner/plan";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";

import type { CurvyCommandData } from "@/planner/plan";
import type { CsucBalanceEntry } from "@/types";

// import type { CurvyCommandData } from "@/planner/addresses/abstract";
// import type { CurvyCommandCSUCAddress } from "@/planner/addresses/csuc";
import type { CsucActionPayload } from "@/types";

// This command automatically sends all available balance from CSUC to Aggregator
export abstract class CSUCAbstractCommand extends CurvyCommand {
  protected sdk!: ICurvySDK;

  // Action to be estimated / executed
  // protected action!: CsucActionSet;

  // CSUC address that will sign / auth. the action to be executed
  // protected from!: CurvyCommandCSUCAddress;
  // protected input!: CsucBalanceEntry;
  protected declare input: CsucBalanceEntry;

  // Destination to which funds will be sent
  protected to!: CsucBalanceEntry;

  // Payload that will be used for estimation / execution of the action
  protected actionPayload!: CsucActionPayload;

  // The inside CSUC total fee (in the currency being moved) that will be taken by Curvy
  protected totalFee!: bigint;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent?: CurvyIntent) {
    super(input);
    this.from = input as CurvyCommandCSUCAddress;
    this.sdk = sdk;
    this.totalFee = 0n;
  }

  // Assumes .estimate() has been called before it
  abstract execute(): Promise<CurvyCommandData>;

  abstract estimate(): Promise<CurvyCommandEstimate>;
}

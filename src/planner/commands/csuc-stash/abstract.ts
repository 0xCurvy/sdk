import type { ICurvySDK } from "@/interfaces/sdk";
import { CsucActionSet } from "@/types/csuc";
import type { CurvyAddressLike, CurvyIntent } from "@/planner/plan";
import { CurvyCommand, CurvyCommandEstimate } from "@/planner/commands/abstract";
import { CurvyCommandData } from "@/planner/addresses/abstract";
import { CurvyCommandCSUCAddress } from "@/planner/addresses/csuc";
import { CsucActionPayload } from "@/types";

// This command automatically sends all available balance from CSUC to Aggregator
export abstract class CSUCAbstractCommand extends CurvyCommand {
  protected sdk!: ICurvySDK;
  protected intent!: CurvyIntent;

  // Action to be estimated / executed
  protected action!: CsucActionSet;

  // CSUC address that will sign / auth. the action to be executed
  protected from!: CurvyCommandCSUCAddress;
  // Destination to which funds will be sent
  protected to!: CurvyAddressLike;

  // Payload that will be used for estimation / execution of the action
  protected actionPayload!: CsucActionPayload;

  // The inside CSUC total fee (in the currency being moved) that will be taken by Curvy
  protected totalFee!: bigint;

  constructor(sdk: ICurvySDK, intent: CurvyIntent, input: CurvyCommandData, to: CurvyAddressLike) {
    super(input);
    this.intent = intent;
    this.from = input as CurvyCommandCSUCAddress;
    this.sdk = sdk;
    this.to = to;
    this.totalFee = 0n;
  }

  // Assumes .estimate() has been called before it
  abstract execute(): Promise<CurvyCommandData>;

  abstract estimate(): Promise<CurvyCommandEstimate>;
}

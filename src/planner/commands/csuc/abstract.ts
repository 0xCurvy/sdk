import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { BALANCE_TYPE, type CsucActionPayload, type CsucBalanceEntry, type Network } from "@/types";

// This command automatically sends all available balance from CSUC to Aggregator
export abstract class CSUCCommand extends CurvyCommand {
  // CSUC address that will sign / auth. the action to be executed
  protected declare input: CsucBalanceEntry;

  // Payload that will be used for estimation / execution of the action
  protected actionPayload?: CsucActionPayload;

  protected network: Network;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent?: CurvyIntent) {
    super(sdk, input);

    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, CSUC commands only accept one data as input.");
    }

    if (input.type !== BALANCE_TYPE.CSUC) {
      throw new Error("Invalid input for command, CSUC commands only accept CSUC balance type as input.");
    }

    this.network = sdk.getNetwork(input.networkSlug);
  }

  abstract execute(): Promise<CurvyCommandData | undefined>;

  abstract estimate(): Promise<CurvyCommandEstimate>;
}

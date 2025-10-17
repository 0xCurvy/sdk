import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { BALANCE_TYPE, type Network, type SaBalanceEntry } from "@/types";

export abstract class SACommand extends CurvyCommand {
  // SA address that will sign / auth. the action to be executed
  protected declare input: SaBalanceEntry;

  protected network: Network;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, SA commands only accept one data as input.");
    }

    if (input.type !== BALANCE_TYPE.SA) {
      throw new Error("Invalid input for command, SA commands only accept SA balance type as input.");
    }

    this.network = sdk.getNetwork(input.networkSlug);
  }

  abstract execute(): Promise<CurvyCommandData | undefined>;

  abstract estimate(): Promise<CurvyCommandEstimate>;
}

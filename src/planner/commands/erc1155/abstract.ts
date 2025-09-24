import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { BALANCE_TYPE, type Erc1155BalanceEntry, type Network } from "@/types";

// This command automatically sends all available balance from CSUC to Aggregator
export abstract class AbstractErc1155Command extends CurvyCommand {
  // CSUC address that will sign / auth. the action to be executed
  protected declare input: Erc1155BalanceEntry;

  protected network: Network;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent?: CurvyIntent) {
    super(sdk, input);

    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, CSUC commands only accept one data as input.");
    }

    if (input.type !== BALANCE_TYPE.ERC1155) {
      throw new Error("Invalid input for command, CSUC commands only accept CSUC balance type as input.");
    }

    this.network = sdk.getNetwork(input.networkSlug);
  }

  abstract execute(): Promise<CurvyCommandData | undefined>;

  abstract estimate(): Promise<CurvyCommandEstimate>;
}

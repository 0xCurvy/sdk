import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { BALANCE_TYPE, type VaultBalanceEntry, type Network } from "@/types";

// This command automatically sends all available balance from CSUC to Aggregator
export abstract class AbstractVaultCommand extends CurvyCommand {
  // CSUC address that will sign / auth. the action to be executed
  protected declare input: VaultBalanceEntry;

  protected network: Network;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    if (Array.isArray(input)) {
      throw new Error("Invalid input for command, CSUC commands only accept one data as input.");
    }

    if (input.type !== BALANCE_TYPE.Vault) {
      throw new Error("Invalid input for command, CSUC commands only accept CSUC balance type as input.");
    }

    this.network = sdk.getNetwork(input.networkSlug);

    if (!this.network.aggregatorContractAddress) {
      throw new Error("Aggregator contract address not found for network.");
    }
  }

  abstract execute(): Promise<CurvyCommandData | undefined>;

  abstract estimate(): Promise<CurvyCommandEstimate>;
}

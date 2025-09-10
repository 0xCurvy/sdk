import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommand } from "@/planner/commands/abstract";
import { AggregatorAggregateCommand } from "@/planner/commands/aggregator/aggregator-aggregate";
import { AggregatorWithdrawToCSUCCommand } from "@/planner/commands/aggregator/aggregator-withdraw-to-csuc";
import { CSUCDepositToAggregatorCommand } from "@/planner/commands/csuc/csuc-deposit-to-aggregator";
import { CSUCWithdrawToEOACommand } from "@/planner/commands/csuc/csuc-withdraw-to-eoa";
import { SaDepositToCsuc } from "@/planner/commands/sa/sa-deposit-to-csuc";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";

export interface ICommandFactory {
  createCommand(name: string, input: CurvyCommandData, intent?: CurvyIntent): CurvyCommand;
}

export class CurvyCommandFactory implements ICommandFactory {
  // TODO: Don't pass entire SDK, but pass only things that are needed
  #sdk: ICurvySDK;

  constructor(sdk: ICurvySDK) {
    this.#sdk = sdk;
  }

  // TODO: Think about moving checks from constructors here, and just adjusting the map of commands for mocks so that we can still test constraints
  createCommand(name: string, input: CurvyCommandData, intent?: CurvyIntent): CurvyCommand {
    switch (name) {
      case "sa-deposit-to-csuc": // This is with gas sponsorship as well
        return new SaDepositToCsuc(this.#sdk, input);
      case "csuc-deposit-to-aggregator":
        return new CSUCDepositToAggregatorCommand(this.#sdk, input);
      case "csuc-withdraw-to-eoa":
        if (!intent) {
          throw new Error("CSUCWithdrawToEOACommand requires an intent");
        }
        return new CSUCWithdrawToEOACommand(this.#sdk, input, intent);
      case "aggregator-aggregate":
        return new AggregatorAggregateCommand(this.#sdk, input, intent);
      case "aggregator-withdraw-to-csuc":
        return new AggregatorWithdrawToCSUCCommand(this.#sdk, input);
    }

    throw new Error(`Unknown command name: ${name}`);
  }
}

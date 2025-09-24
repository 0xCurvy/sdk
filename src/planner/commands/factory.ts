import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommand } from "@/planner/commands/abstract";
import { AggregatorAggregateCommand } from "@/planner/commands/aggregator/aggregator-aggregate";
import { AggregatorWithdrawToErc1155Command } from "@/planner/commands/aggregator/aggregator-withdraw-to-erc1155";
import { Erc1155DepositToAggregatorCommand } from "@/planner/commands/erc1155/erc1155-deposit-to-aggregator";
import { Erc1155WithdrawToEOACommand } from "@/planner/commands/erc1155/erc1155-withdraw-to-eoa";
import { SaErc1155OnboardCommand } from "@/planner/commands/sa/sa-erc1155-onboard-command";
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
        return new SaErc1155OnboardCommand(this.#sdk, input);
      case "erc1155-deposit-to-aggregator":
        return new Erc1155DepositToAggregatorCommand(this.#sdk, input);
      case "erc1155-withdraw-to-eoa":
        if (!intent) {
          throw new Error(`${name} requires an intent`);
        }

        return new Erc1155WithdrawToEOACommand(this.#sdk, input, intent);
      case "aggregator-aggregate":
        return new AggregatorAggregateCommand(this.#sdk, input, intent);
      case "aggregator-withdraw-to-csuc":
        return new AggregatorWithdrawToErc1155Command(this.#sdk, input);
    }

    throw new Error(`Unknown command name: ${name}`);
  }
}

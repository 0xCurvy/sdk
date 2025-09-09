import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommand } from "@/planner/commands/abstract";
import { AggregatorAggregateCommand } from "@/planner/commands/aggregator/aggregator-aggregate";
import { AggregatorWithdrawToCsucCommand } from "@/planner/commands/aggregator/aggregator-withdraw-to-csuc-command";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";

export interface ICommandFactory {
  createCommand(name: string, input: CurvyCommandData, amount?: bigint, intent?: CurvyIntent): CurvyCommand;
}

export class CurvyCommandFactory implements ICommandFactory {
  // TODO: Don't pass entire SDK, but pass only things that are needed
  #sdk: ICurvySDK;

  constructor(sdk: ICurvySDK) {
    this.#sdk = sdk;
  }

  createCommand(name: string, input: CurvyCommandData, amount?: bigint, intent?: CurvyIntent): CurvyCommand {
    switch (name) {
      case "sa-deposit-to-csuc": // This is with gas sponsorship as well
        throw new Error("Command not implemented.");
      case "csuc-deposit-to-aggregator":
        throw new Error("Command not implemented.");
      case "csuc-withdraw-to-eoa":
        if (!intent) {
          throw new Error("Intent is required for csuc-withdraw-to-eoa command.");
        }

        throw new Error("Command not implemented.");
      case "aggregator-aggregate":
        if (amount === undefined || intent === undefined) {
          throw new Error("Amount is required for aggregator-aggregate command.");
        }
        return new AggregatorAggregateCommand(this.#sdk, input, amount, intent);
      case "aggregator-withdraw-to-csuc":
        return new AggregatorWithdrawToCsucCommand(input, this.#sdk);
    }

    throw new Error(`Unknown command name: ${name}`);
  }
}

import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommand, CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AggregatorAggregateCommand } from "@/planner/commands/aggregator/aggregator-aggregate";
import { AggregatorWithdrawCommand } from "@/planner/commands/aggregator/aggregator-withdraw";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";

export interface ICommandFactory {
  createCommand(
    id: string,
    name: string,
    input: CurvyCommandData,
    intent?: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ): CurvyCommand;
}

export class CurvyCommandFactory implements ICommandFactory {
  #sdk: ICurvySDK;

  constructor(sdk: ICurvySDK) {
    this.#sdk = sdk;
  }

  // TODO: Think about moving checks from constructors here, and just adjusting the map of commands for mocks so that we can still test constraints
  createCommand(
    id: string,
    name: string,
    input: CurvyCommandData,
    intent?: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ): CurvyCommand {
    switch (name) {
      case "aggregator-aggregate": {
        return new AggregatorAggregateCommand(id, this.#sdk, input, intent, estimate);
      }
      case "aggregator-withdraw": {
        if (!intent) {
          throw new Error("Intent is required for aggregator withdraw command.");
        }

        return new AggregatorWithdrawCommand(id, this.#sdk, input, intent, estimate);
      }
    }

    throw new Error(`Unknown command name: ${name}`);
  }
}

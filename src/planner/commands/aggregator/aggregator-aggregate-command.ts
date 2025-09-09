//@ts-nocheck

import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";

export class AggregatorAggregateCommand extends CurvyCommand {
  #sdk: ICurvySDK;
  #amount: bigint;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, amount: bigint) {
    super(input);
    this.#sdk = sdk;
    this.#amount = amount;
  }

  execute(): Promise<CurvyCommandData> {
    throw new Error("Method not implemented.");
  }
  estimate(): Promise<CurvyCommandEstimate> {
    throw new Error("Method not implemented.");
  }
}

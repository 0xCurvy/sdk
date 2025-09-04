import { CurvyCommandInput } from "../addresses/abstract";

export interface CurvyCommandEstimate {
  curvyFee: bigint;
  gas: bigint;
}

export abstract class CurvyCommand {
  protected input: CurvyCommandInput;

  constructor(input: CurvyCommandInput) {
    this.input = input;
  }

  abstract execute(): Promise<CurvyCommandInput>;
  abstract estimate(): Promise<CurvyCommandEstimate>;
}
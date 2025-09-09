import type { CurvyCommandData } from "../plan";

export interface CurvyCommandEstimate {
  curvyFee: bigint;
  gas: bigint;
}

export abstract class CurvyCommand {
  protected input: CurvyCommandData;

  constructor(input: CurvyCommandData) {
    this.input = input;
  }

  abstract execute(): Promise<CurvyCommandData>;
  abstract estimate(): Promise<CurvyCommandEstimate>;
}
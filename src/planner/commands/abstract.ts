import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandData } from "../plan";

export interface CurvyCommandEstimate {
  curvyFee: bigint;
  gas: bigint;
}

export abstract class CurvyCommand {
  protected sdk: ICurvySDK;
  protected input: CurvyCommandData;

  constructor(sdk: ICurvySDK, input: CurvyCommandData) {
    this.sdk = sdk;
    this.input = input;
  }

  abstract execute(): Promise<CurvyCommandData>;
  abstract estimate(): Promise<CurvyCommandEstimate>;
}

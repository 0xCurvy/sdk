import { CurvyAddressLike } from "@/planner/plan";

export interface CurvyCommandEstimate {
  curvyFee: bigint;
  gas: bigint;
}

export abstract class CurvyCommand {
  protected address: CurvyAddressLike | CurvyAddressLike[];

  constructor(address: CurvyAddressLike | CurvyAddressLike[]) {
    this.address = address;
  }

  abstract execute(): Promise<CurvyAddressLike | CurvyAddressLike[]>;
  abstract estimate(): Promise<CurvyCommandEstimate>;
}
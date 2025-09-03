import { CurvyAddressLike } from "@/planner/plan";

export interface CurvyCommandEstimate {
  curvyFee: bigint;
  gas: bigint;
}

export abstract class CurvyCommand {
  protected address: CurvyAddressLike;

  constructor(address: CurvyAddressLike) {
    this.address = address;
  }

  abstract execute(): Promise<CurvyAddressLike>;
  abstract estimate(): Promise<CurvyCommandEstimate>;
}
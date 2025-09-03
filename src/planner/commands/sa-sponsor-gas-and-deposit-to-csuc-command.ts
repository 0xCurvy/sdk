import type { CurvyAddressLike } from "@/planner/plan";
import { CurvyCommand, CurvyCommandEstimate } from "@/planner/commands/abstract";

export class SASponsorGasAndDepositToCSUCCommand extends CurvyCommand {
  estimate(): Promise<CurvyCommandEstimate> {
    const estimateResult: CurvyCommandEstimate = {
      gas: 100n,
      curvyFee: 2000n,
    };

    return Promise.resolve(estimateResult);
  }

  execute(): Promise<CurvyAddressLike> {
    console.log("Sponsoring gas!");

    // TODO: Implement

    // TODO: Should we copy?
    const newAddress = this.address;
    newAddress.type = "csuc";
    return Promise.resolve(newAddress);
  }
}

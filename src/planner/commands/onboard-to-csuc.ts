import type { CurvyCommandEstimate } from "@/planner/commands/interface";
import { CurvyCommand } from "@/planner/commands/interface";
import type { CurvyAddressLike } from "@/planner/plan";

export class OnboardToCSUCCommand extends CurvyCommand {
  address: CurvyAddressLike;

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

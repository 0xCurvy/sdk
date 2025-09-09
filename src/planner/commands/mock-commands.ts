import { CurvyCommand, CurvyCommandEstimate } from "./abstract";
import { CurvyCommandData } from "@/planner/addresses/abstract";
import { CurvyCommandSAAddress } from "@/planner/addresses/sa";

export class MockSuccessCommand extends CurvyCommand {
  execute(): Promise<CurvyCommandData> {
    return Promise.resolve(this.input);
  }

  estimate(): Promise<CurvyCommandEstimate> {
    return Promise.resolve(<CurvyCommandEstimate>{
      curvyFee: 0n,
      gas: 0n
    });
  }
}

export class MockFailCommand extends CurvyCommand {
  execute(): Promise<CurvyCommandData> {
    throw new Error("Execution failed! This is a mock command that always fails");
  }

  estimate(): Promise<CurvyCommandEstimate> {
    throw new Error("Estimation failed! This is a mock command that always fails");
  }
}

// @ts-ignore
export const mockAddress = new CurvyCommandSAAddress(20n, <Currency>{}, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "...")
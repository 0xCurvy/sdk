import { CurvyAddressLike } from "../plan";
import { CurvyCommand, CurvyCommandEstimate } from "./abstract";

export class MockSuccessCommand extends CurvyCommand {
  execute(): Promise<CurvyAddressLike> {
    return Promise.resolve(mockAddressLike);
  }

  estimate(): Promise<CurvyCommandEstimate> {
    return Promise.resolve(<CurvyCommandEstimate>{
      curvyFee: 0n,
      gas: 0n
    });
  }
}

export class MockFailCommand extends CurvyCommand {
  execute(): Promise<CurvyAddressLike> {
    throw new Error("Execution failed! This is a mock command that always fails");
  }

  estimate(): Promise<CurvyCommandEstimate> {
    throw new Error("Estimation failed! This is a mock command that always fails");
  }
}

const mockAddressLike: CurvyAddressLike = {
  address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  type: "sa",
  balance: 20n,
  privateKey: "..."
};
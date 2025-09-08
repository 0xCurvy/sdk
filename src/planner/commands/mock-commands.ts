import type { CurvyCommandData } from "@/planner/plan";
import type { SaBalanceEntry } from "@/types";
import { CurvyCommand, type CurvyCommandEstimate } from "./abstract";

export class MockSuccessCommand extends CurvyCommand {
  execute(): Promise<CurvyCommandData> {
    return Promise.resolve(this.input);
  }

  estimate(): Promise<CurvyCommandEstimate> {
    return Promise.resolve(<CurvyCommandEstimate>{
      curvyFee: 0n,
      gas: 0n,
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

export const mockAddress = {
  source: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  networkSlug: "ethereum-sepolia",
  type: "sa",
  symbol: "ETH",
  balance: 20n,
  environment: "testnet",
  createdAt: Date.now().toString(),
  walletId: "mock-wallet-id",
  lastUpdated: Date.now(),
} satisfies SaBalanceEntry;

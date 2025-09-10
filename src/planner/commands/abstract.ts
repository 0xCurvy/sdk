import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyHandle } from "@/types";
import type { CurvyCommandData } from "../plan";

export interface CurvyCommandEstimate {
  curvyFee: bigint;
  gas: bigint;
}

export abstract class CurvyCommand {
  protected sdk: ICurvySDK;
  protected input: CurvyCommandData;
  protected readonly senderCurvyHandle: CurvyHandle;

  constructor(sdk: ICurvySDK, input: CurvyCommandData) {
    this.sdk = sdk;
    this.input = input;
    this.senderCurvyHandle = sdk.walletManager.activeWallet.curvyHandle;
  }

  abstract execute(): Promise<CurvyCommandData | undefined>;
  abstract estimate(): Promise<CurvyCommandEstimate>;
}

import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyHandle } from "@/types";
import type { CurvyCommandData } from "../plan";

export interface CurvyCommandEstimate {
  [key: string]: unknown;

  data?: CurvyCommandData;

  curvyFee: bigint;
  gas: bigint;
}

export abstract class CurvyCommand {
  protected sdk: ICurvySDK;
  protected input: CurvyCommandData;
  protected readonly senderCurvyHandle: CurvyHandle;
  protected readonly estimateData: CurvyCommandEstimate | undefined;
  readonly id: string;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    this.sdk = sdk;
    this.input = input;
    this.estimateData = estimate;
    this.senderCurvyHandle = sdk.walletManager.activeWallet.curvyHandle;
    this.id = id;
  }

  abstract execute(): Promise<CurvyCommandData | undefined>;
  abstract estimate(): Promise<CurvyCommandEstimate>;
}

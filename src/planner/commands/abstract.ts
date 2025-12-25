import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyHandle, CurvyPublicKeys, HexString, Network } from "@/types";
import type { CurvyCommandData } from "../plan";

export interface CurvyCommandEstimate {
  curvyFeeInCurrency: bigint;
  gasFeeInCurrency: bigint;
}

export abstract class CurvyCommand {
  protected sdk: ICurvySDK;
  protected readonly input: CurvyCommandData;
  protected readonly senderCurvyHandle: CurvyHandle | null;
  protected readonly network: Network;

  public estimate?: CurvyCommandEstimate;

  readonly id: string;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    this.id = id;
    this.sdk = sdk;
    this.input = input;
    this.estimate = estimate;
    this.senderCurvyHandle = sdk.walletManager.activeWallet.curvyHandle;

    if (Array.isArray(this.input)) {
      this.network = sdk.getNetwork(this.input[0].networkSlug);
    } else {
      this.network = sdk.getNetwork(this.input.networkSlug);
    }
  }

  abstract get recipient(): HexString | CurvyHandle | CurvyPublicKeys;
  abstract get name(): string;

  abstract estimateFees(): Promise<CurvyCommandEstimate>;
  abstract getResultingBalanceEntry(executionData?: unknown): Promise<CurvyCommandData | undefined>;

  abstract execute(): Promise<CurvyCommandData | undefined>;

  abstract get grossAmount(): bigint;
  get netAmount(): bigint {
    if (!this.estimate) {
      throw new Error("Command not estimated.");
    }

    const { curvyFeeInCurrency, gasFeeInCurrency } = this.estimate;

    return this.grossAmount - curvyFeeInCurrency - gasFeeInCurrency;
  }
}

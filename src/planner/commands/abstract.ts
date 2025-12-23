import type { ICurvySDK } from "@/interfaces/sdk";
import { EvmRpc } from "@/rpc";
import type { CurvyHandle, Network } from "@/types";
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
  protected readonly rpc: EvmRpc;

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

    const rpc = sdk.rpcClient.Network(this.network.id);

    if (!(rpc instanceof EvmRpc)) {
      throw new Error("AbstractMetaTransactionCommand only supports EVM networks.");
    }

    this.rpc = rpc;
  }

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

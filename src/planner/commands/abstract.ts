import type { ICurvySDK } from "@/interfaces/sdk";
import { EvmRpc } from "@/rpc";
import type { CurvyHandle, Network } from "@/types";
import type { CurvyCommandData } from "../plan";

export interface CurvyCommandEstimate {
  curvyFeeInCurrency: bigint;
  gasFeeInCurrency: bigint;
  netAmount: bigint;
}

export abstract class CurvyCommand {
  protected sdk: ICurvySDK;
  protected readonly input: CurvyCommandData;
  protected readonly senderCurvyHandle: CurvyHandle;
  protected readonly estimateData: CurvyCommandEstimate | undefined;
  protected readonly network: Network;
  protected readonly rpc: EvmRpc;

  readonly id: string;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    this.id = id;
    this.sdk = sdk;
    this.input = input;
    this.estimateData = estimate;
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

  abstract calculateCurvyFeeInCurrency(): Promise<bigint>;
  abstract calculateGasFeeInCurrency(): Promise<bigint>;
  abstract getDesiredAmount(): Promise<bigint>;

  async estimate(): Promise<CurvyCommandEstimate> {
    const curvyFeeInCurrency = await this.calculateCurvyFeeInCurrency();
    const gasFeeInCurrency = await this.calculateGasFeeInCurrency();

    const netAmount = (await this.getDesiredAmount()) - curvyFeeInCurrency;

    return {
      curvyFeeInCurrency,
      gasFeeInCurrency,
      netAmount,
    };
  }

  async execute(): Promise<CurvyCommandData | undefined> {
    if (!this.estimateData) {
      throw new Error("Command must be estimated before execution!");
    }
    return this.run();
  }
  protected abstract run(): Promise<CurvyCommandData | undefined>;

  protected abstract validateInput<T extends CurvyCommandData>(input: CurvyCommandData): asserts input is T;
}

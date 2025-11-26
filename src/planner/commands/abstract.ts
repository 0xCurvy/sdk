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
  protected readonly senderCurvyHandle: CurvyHandle;
  #estimateData: CurvyCommandEstimate | undefined;
  protected readonly network: Network;
  protected readonly rpc: EvmRpc;

  readonly id: string;

  protected constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    this.id = id;
    this.sdk = sdk;
    this.input = input;
    this.#estimateData = estimate;
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
  abstract get grossAmount(): bigint;
  get estimateData() {
    if (!this.#estimateData) {
      throw new Error("Command not estimated yet!");
    }

    return this.#estimateData;
  }

  abstract estimateFees(): Promise<CurvyCommandEstimate>;
  abstract getCommandResult(executionData?: unknown): Promise<CurvyCommandData | undefined>;

  abstract execute(): Promise<CurvyCommandData | undefined>;

  protected abstract validateInput<T extends CurvyCommandData>(input: CurvyCommandData): asserts input is T;

  async getNetAmount(): Promise<bigint> {
    if (!this.estimateData) {
      throw new Error("Fees must be estimated before getting net amount!");
    }

    const { curvyFeeInCurrency, gasFeeInCurrency } = this.estimateData;

    return this.grossAmount - curvyFeeInCurrency - gasFeeInCurrency;
  }

  async estimate(): Promise<CurvyCommandEstimate & { commandResult: CurvyCommandData | undefined }> {
    const feeEstimate = await this.estimateFees();

    // Bind estimate to the current command for dry run,
    // execution context will get this from estimated plan (passed in constructor)
    this.#estimateData = feeEstimate;
    const commandResult = await this.getCommandResult();

    return {
      ...feeEstimate,
      commandResult,
    };
  }
}

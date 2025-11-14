import type { ICurvySDK } from "@/interfaces/sdk";
import { EvmRpc } from "@/rpc";
import type { BalanceEntry, CurvyHandle, Network } from "@/types";
import type { CurvyCommandData } from "../plan";

export interface CurvyCommandEstimate {
  data?: CurvyCommandData;

  curvyFeeInCurrency: bigint;
  gasFeeInCurrency: bigint;
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

  abstract estimate(): Promise<CurvyCommandEstimate>;
  abstract execute(): Promise<CurvyCommandData | undefined>;

  protected abstract validateInput<T extends CurvyCommandData>(input: CurvyCommandData): asserts input is T;
  //TODO think how we can avoid args unknown, currently only used by onboard native to vault because of gas subtraction
  protected abstract calculateCurvyFee(...args: unknown[]): Promise<bigint> | bigint;

  protected abstract getResultingBalanceEntry(...args: unknown[]): Promise<BalanceEntry> | BalanceEntry;
  protected abstract getNetAmount(): bigint;
}

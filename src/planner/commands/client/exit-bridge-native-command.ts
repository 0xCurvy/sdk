import { getQuote, getStatus } from "@lifi/sdk";
import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import {
  AbstractClientCommand,
  type ClientTransactionEstimateWithBridgeQuote,
} from "@/planner/commands/client/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import type { SaBalanceEntry } from "@/types";
import { pollForCriteria, toSlug } from "@/utils/helpers";

export class ExitBridgeNativeCommand extends AbstractClientCommand {
  readonly #intent: CurvyIntent;
  declare estimate: ClientTransactionEstimateWithBridgeQuote;

  constructor(
    id: string,
    sdk: ICurvySDK,
    input: CurvyCommandData,
    intent: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ) {
    super(id, sdk, input, estimate);
    this.#intent = intent;

    if (!this.#intent.exitNetwork) {
      throw new Error(`${this.name}: exitNetwork is required in intent`);
    }
  }

  get name() {
    return "ExitBridgeNativeCommand";
  }

  async getResultingBalanceEntry(): Promise<CurvyCommandData> {
    return {
      ...this.input,
      balance: this.netAmount,
      networkSlug: toSlug(this.#intent.exitNetwork!.name),
    } satisfies SaBalanceEntry;
  }

  async estimateFees() {
    const { maxFeePerGas } = await this.rpc.provider.estimateFeesPerGas();
    const gasLimit = 300_000n;

    const gasFeeInCurrency = (maxFeePerGas * gasLimit * 110n) / 100n;
    const curvyFeeInCurrency = 0n;

    this.estimate = {
      ...this.estimate,
      gasFeeInCurrency,
      curvyFeeInCurrency,
      gasLimit,
      maxFeePerGas,
    };

    const bridgeQuote = await getQuote({
      fromChain: this.network.chainId,
      toChain: this.#intent.exitNetwork!.chainId,
      fromToken: this.#intent.currency.symbol,
      toToken: this.#intent.currency.symbol,
      slippage: 0.01,
      fromAddress: this.input.source,
      toAddress: this.input.source,
      fromAmount: this.netAmount.toString(),
    });

    this.estimate = {
      ...this.estimate,
      bridgeQuote,
    };

    return this.estimate;
  }

  async execute(): Promise<CurvyCommandData> {
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const { gasLimit, maxFeePerGas, bridgeQuote } = this.estimate;

    const hash = await this.rpc.walletClient.sendTransaction({
      account: privateKeyToAccount(privateKey),
      chain: this.rpc.walletClient.chain,
      to: bridgeQuote.transactionRequest?.to as Address,
      data: bridgeQuote.transactionRequest?.data as Address,
      value: BigInt(bridgeQuote.transactionRequest?.value || "0"),
      gasLimit,
      maxFeePerGas,
    });

    await this.rpc.provider.waitForTransactionReceipt({ hash });

    await pollForCriteria(
      () => {
        return getStatus({
          txHash: hash,
          fromChain: bridgeQuote.action.fromChainId,
          toChain: bridgeQuote.action.toChainId,
          bridge: bridgeQuote.tool,
        });
      },
      ({ status }) => {
        return status === "DONE" || status === "FAILED";
      },
    );

    return this.getResultingBalanceEntry();
  }
}

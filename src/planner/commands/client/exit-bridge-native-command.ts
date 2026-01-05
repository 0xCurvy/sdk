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
  }

  get name() {
    return "ExitBridgeNativeCommand";
  }

  async getResultingBalanceEntry(): Promise<CurvyCommandData> {
    return {
      ...this.input,
      balance: this.netAmount,
      networkSlug: toSlug(this.#intent.network.name),
    } satisfies SaBalanceEntry;
  }

  async estimateFees() {
    const { maxFeePerGas } = await this.rpc.provider.estimateFeesPerGas();
    const gasLimit = 320_000n;

    const gasFeeInCurrency = maxFeePerGas * gasLimit;
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
      toChain: this.#intent.network.chainId,
      fromToken: this.#intent.currency.symbol,
      toToken: this.#intent.currency.symbol,
      slippage: 0.01,
      fromAddress: this.input.source,
      toAddress: this.input.source,
      fromAmount: this.netAmount.toString(),
    });

    // TODO check if this calc is correct especially when sending ERC20
    this.estimate = {
      ...this.estimate,
      bridgeFeeInCurrency:
        (bridgeQuote.estimate.feeCosts?.reduce((acc, { amount }) => acc + BigInt(amount), 0n) ?? 0n) +
        (bridgeQuote.estimate.gasCosts?.reduce((acc, { amount }) => acc + BigInt(amount), 0n) ?? 0n),
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
        if (status === "FAILED") {
          throw new Error(`Bridge failed for transaction with hash ${hash}`);
        }
        return status === "DONE";
      },
      24,
      5000,
    );

    return this.getResultingBalanceEntry();
  }
}

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
import { isHexString, type SaBalanceEntry } from "@/types";
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

  override get recipient() {
    if (!this.#intent.recipient || !isHexString(this.#intent.recipient)) {
      throw new Error(`${this.name}: Recipient MUST be a hex string address, got ${this.#intent.recipient}`);
    }

    return this.#intent.recipient;
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

    const { estimate, transactionRequest } = await getQuote({
      fromChain: this.network.chainId,
      toChain: this.#intent.network.chainId,
      fromToken: this.#intent.currency.symbol,
      toToken: this.#intent.currency.symbol,
      slippage: 0.01,
      fromAddress: this.input.source,
      toAddress: this.recipient,
      fromAmount: this.netAmount.toString(),
    });

    if (!estimate || !transactionRequest) {
      throw new Error(`${this.name}: Failed to get bridge quote for exit bridge.`);
    }

    this.estimate = {
      gasLimit,
      maxFeePerGas,
      gasFeeInCurrency,
      curvyFeeInCurrency: 0n,
      bridgeFeeInCurrency: estimate.feeCosts?.reduce((acc, { amount }) => acc + BigInt(amount), 0n) ?? 0n,
      transactionRequest,
    };

    return this.estimate;
  }

  async execute(): Promise<CurvyCommandData> {
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const { gasLimit, maxFeePerGas, transactionRequest } = this.estimate;

    const hash = await this.rpc.walletClient.sendTransaction({
      account: privateKeyToAccount(privateKey),
      to: transactionRequest.to as Address,
      data: transactionRequest.data as Address,
      value: BigInt(transactionRequest.value || "0"),
      gas: gasLimit,
      maxFeePerGas,
    });

    await this.rpc.provider.waitForTransactionReceipt({ hash });

    await pollForCriteria(
      () => {
        return getStatus({
          txHash: hash,
        }).catch();
      },
      ({ status }) => {
        if (status === "FAILED") {
          throw new Error(`Bridge failed for transaction with hash ${hash}`);
        }
        if (status === "INVALID" || status === "NOT_FOUND") {
          throw new Error(`Bridge transaction with hash ${hash} is invalid or not found`);
        }
        return status === "DONE";
      },
      24,
      5000,
    );

    return this.getResultingBalanceEntry();
  }
}

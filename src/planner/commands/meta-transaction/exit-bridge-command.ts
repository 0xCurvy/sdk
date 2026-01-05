import { privateKeyToAccount } from "viem/accounts";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractSaMetaTransactionCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { type HexString, META_TRANSACTION_TYPES, type SaBalanceEntry } from "@/types";
import { pollForCriteria, toSlug } from "@/utils/helpers";

export class ExitBridgeCommand extends AbstractSaMetaTransactionCommand {
  readonly #intent: CurvyIntent;

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
    return "ExitBridgeCommand";
  }

  get metaTransactionType() {
    return META_TRANSACTION_TYPES.EXIT_BRIDGE;
  }

  async getResultingBalanceEntry(): Promise<CurvyCommandData> {
    return {
      ...this.input,
      balance: this.netAmount, // Technically this is not accurate, as the final amount will be somewhere between toAmount and toAmountMin from quote
      networkSlug: toSlug(this.intent.network.name),
    } satisfies SaBalanceEntry;
  }

  get intent(): Readonly<CurvyIntent> {
    return Object.freeze(this.#intent);
  }

  override get recipient() {
    return this.intent.recipient as HexString;
  }

  override async estimateFees() {
    const {
      gasFeeInCurrency,
      id: estimateId,
      bridgeFeeInCurrency,
    } = await this.calculateGasFee({
      exitNetwork: toSlug(this.intent.network.name),
    });
    const curvyFeeInCurrency = await this.calculateCurvyFee();

    this.estimate = {
      gasFeeInCurrency,
      estimateId,
      curvyFeeInCurrency,
      bridgeFeeInCurrency,
    };

    return this.estimate;
  }

  async execute(): Promise<CurvyCommandData> {
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const { estimateId: id } = this.estimate;

    const signedAuthorization = await this.rpc.walletClient.signAuthorization({
      account: privateKeyToAccount(privateKey),
      contractAddress: this.network.tokenBridgeContractAddress as HexString,
    });

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature: JSON.stringify(signedAuthorization) });

    await pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`${this.name}: Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    return this.getResultingBalanceEntry();
  }
}

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

    if (!this.intent.exitNetwork) {
      throw new Error(`${this.name}: exitNetwork is required in intent`);
    }
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
      networkSlug: toSlug(this.intent.exitNetwork!.name),
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
      exitNetwork: toSlug(this.intent.exitNetwork!.name),
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
    const { estimateId: id } = this.estimate;

    const signature = await this.signMetaTransaction(this.intent.recipient as HexString);

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

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

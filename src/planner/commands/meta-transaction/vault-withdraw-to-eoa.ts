import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractVaultMetaTransactionCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type HexString,
  isHexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type SaBalanceEntry,
} from "@/types";

// This command automatically sends all available balance from CSUC to external address
export class VaultWithdrawToEOACommand extends AbstractVaultMetaTransactionCommand {
  readonly #intent: CurvyIntent;

  constructor(
    id: string,
    sdk: ICurvySDK,
    input: CurvyCommandData,
    intent: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ) {
    super(id, sdk, input, estimate);

    if (!isHexString(intent.toAddress)) {
      throw new Error(`${this.name}: toAddress MUST be a hex string address`);
    }

    this.#intent = intent;
  }

  get intent(): Readonly<CurvyIntent> {
    return Object.freeze(this.#intent);
  }

  get name() {
    return "VaultWithdrawToEOACommand";
  }

  get metaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_WITHDRAW;
  }

  override get toAddress(): HexString {
    return this.intent.toAddress as HexString;
  }

  async getResultingBalanceEntry() {
    return {
      ...this.input,
      balance: this.netAmount,
      type: BALANCE_TYPE.SA,
      createdAt: new Date().toISOString(),
    } satisfies SaBalanceEntry;
  }

  async execute(): Promise<CurvyCommandData | undefined> {
    const { estimateId: id } = this.estimate;

    const signature = await this.signMetaTransaction(this.intent.toAddress as HexString);

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`[VaultWithdrawToEoaCommand] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    return this.getResultingBalanceEntry();
  }
}

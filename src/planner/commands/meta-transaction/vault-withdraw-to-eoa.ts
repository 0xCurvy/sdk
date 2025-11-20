import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractMetaTransactionCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type HexString,
  isHexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type SaBalanceEntry,
  type VaultBalanceEntry,
} from "@/types";
import type { DeepNonNullable } from "@/types/helper";

// This command automatically sends all available balance from CSUC to external address
export class VaultWithdrawToEOACommand extends AbstractMetaTransactionCommand {
  declare input: DeepNonNullable<VaultBalanceEntry>;

  readonly #intent: CurvyIntent;

  constructor(
    id: string,
    sdk: ICurvySDK,
    input: CurvyCommandData,
    intent: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ) {
    super(id, sdk, input, estimate);

    this.validateInput(this.input);

    if (!isHexString(intent.toAddress)) {
      throw new Error("CSUCWithdrawFromCommand: toAddress MUST be a hex string address");
    }

    this.#intent = intent;
  }

  get intent(): Readonly<CurvyIntent> {
    return Object.freeze(this.#intent);
  }

  override validateInput(input: SaBalanceEntry | VaultBalanceEntry): asserts input is VaultBalanceEntry {
    if (input.type !== BALANCE_TYPE.VAULT) {
      throw new Error(
        "Invalid input for command, VaultDepositToAggregatorCommand only accept Vault balance type as input.",
      );
    }
  }

  get name() {
    return "VaultWithdrawToEOACommand";
  }

  get metaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_WITHDRAW;
  }

  async getCommandResult() {
    return undefined;
  }

  async execute(): Promise<CurvyCommandData | undefined> {
    const { estimateId: id } = this.estimateData;

    const signature = await this.signMetaTransaction(this.intent.toAddress as HexString);

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`[VaultWithdrawToEoaCommand] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    return;
  }
}

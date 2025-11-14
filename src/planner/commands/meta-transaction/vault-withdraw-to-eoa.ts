import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractMetaTransactionCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type BalanceEntry,
  type HexString,
  isHexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type SaBalanceEntry,
  type VaultBalanceEntry,
} from "@/types";

interface VaultWithdrawToEOACommandEstimate extends CurvyCommandEstimate {
  id: string;
}

// This command automatically sends all available balance from CSUC to external address
export class VaultWithdrawToEOACommand extends AbstractMetaTransactionCommand {
  declare estimateData: VaultWithdrawToEOACommandEstimate | undefined;
  declare input: VaultBalanceEntry;

  #intent: CurvyIntent;

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

  get name(): string {
    return "VaultWithdrawToEOACommand";
  }

  get metaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_WITHDRAW;
  }

  validateInput(input: SaBalanceEntry | VaultBalanceEntry): asserts input is VaultBalanceEntry {
    if (input.type !== BALANCE_TYPE.VAULT) {
      throw new Error(
        "Invalid input for command, VaultDepositToAggregatorCommand only accept Vault balance type as input.",
      );
    }
  }

  getResultingBalanceEntry(): Promise<BalanceEntry> {
    throw new Error("VaultWithdrawToEOACommand does not return a balance entry.");
  }

  async execute(): Promise<CurvyCommandData | undefined> {
    if (!this.estimateData) {
      throw new Error("[VaultWithdrawToEoaCommand] Command must be estimated before execution!");
    }
    const { id } = this.estimateData;

    const signature = await this.signMetaTransaction(this.#intent.toAddress as HexString);

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

  async estimate(): Promise<VaultWithdrawToEOACommandEstimate> {
    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await super.estimate();

    return {
      gasFeeInCurrency,
      curvyFeeInCurrency,
      id,
    };
  }
}

import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractVaultCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type HexString,
  isHexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type SaBalanceEntry,
} from "@/types";

interface VaultWithdrawToEOACommandEstimate extends CurvyCommandEstimate {
  id: string;
  data: SaBalanceEntry;
}

// This command automatically sends all available balance from CSUC to external address
export class VaultWithdrawToEOACommand extends AbstractVaultCommand {
  #intent: CurvyIntent;
  protected declare estimateData: VaultWithdrawToEOACommandEstimate | undefined;

  constructor(
    id: string,
    sdk: ICurvySDK,
    input: CurvyCommandData,
    intent: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ) {
    super(id, sdk, input, estimate);

    if (!isHexString(intent.toAddress)) {
      throw new Error("CSUCWithdrawFromCommand: toAddress MUST be a hex string address");
    }

    this.#intent = intent;
  }

  getMetaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_WITHDRAW;
  }

  getToAddress(): HexString {
    return this.#intent.toAddress as HexString;
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

    await this.sdk.storage.removeSpentBalanceEntries("address", [this.input]);

    await new Promise((res) => setTimeout(res, 3000)); // Wait for balances to be updated properly

    const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
    await this.sdk.refreshAddressBalances(curvyAddress);

    return;
  }

  async estimate(): Promise<VaultWithdrawToEOACommandEstimate> {
    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await super.estimate();

    return {
      gasFeeInCurrency,
      curvyFeeInCurrency,
      id,
      data: {
        ...this.input,
        createdAt: "PLACEHOLDER",
        type: BALANCE_TYPE.SA,
        source: this.#intent.toAddress as HexString,
        balance: this.input.balance - curvyFeeInCurrency - gasFeeInCurrency,
      },
    };
  }
}

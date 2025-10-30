import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractVaultCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { type HexString, isHexString, META_TRANSACTION_TYPES } from "@/types";

// This command automatically sends all available balance from CSUC to external address
export class VaultExplicitWithdrawToEOACommand extends AbstractVaultCommand {
  #intent: CurvyIntent;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent: CurvyIntent) {
    super("explicit-withdraw", sdk, input);

    if (!isHexString(intent.toAddress)) {
      throw new Error("VaultExplicitWithdrawToEOACommand: toAddress MUST be a hex string address");
    }

    if (!isHexString(intent.privateKey)) {
      throw new Error("VaultExplicitWithdrawToEOACommand: toAddress MUST be a hex string address");
    }

    this.#intent = intent;
  }

  async execute(): Promise<CurvyCommandData> {
    const { id, gas, curvyFee } = await this.estimate();

    const amount = this.input.balance;

    const totalFees = gas + curvyFee;

    const effectiveAmount = amount - totalFees;

    const signature = await this.signMetaTransaction(
      this.#intent.toAddress as HexString,
      effectiveAmount,
      gas,
      META_TRANSACTION_TYPES.VAULT_WITHDRAW,
    );

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`[VaultExplicitWithdrawToEoaCommand] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    return {} as any;
  }

  async estimate(): Promise<CurvyCommandEstimate & { id: string }> {
    const currencyAddress = this.input.currencyAddress;

    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await this.sdk.apiClient.metaTransaction.EstimateGas({
      type: META_TRANSACTION_TYPES.VAULT_WITHDRAW,
      currencyAddress,
      amount: this.input.balance.toString(),
      fromAddress: this.input.source,
      network: this.input.networkSlug,
      toAddress: this.#intent.toAddress,
    });

    return {
      gas: BigInt(gasFeeInCurrency ?? "0"),
      curvyFee: BigInt(curvyFeeInCurrency ?? "0"),
      id,
    };
  }
}

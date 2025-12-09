import { AbstractClientCommand } from "@/planner/commands/client/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { BALANCE_TYPE, type HexString, type VaultBalanceEntry } from "@/types";

// TODO: Move to config, even better read from RPC
const DEPOSIT_TO_VAULT_FEE = 1;

export class VaultOnboardNativeCommand extends AbstractClientCommand {
  get name() {
    return "VaultOnboardNativeCommand";
  }

  async getResultingBalanceEntry(): Promise<CurvyCommandData> {
    const { createdAt: _, ...inputData } = this.input;

    return {
      ...inputData,
      balance: this.netAmount,
      type: BALANCE_TYPE.VAULT,
    } satisfies VaultBalanceEntry;
  }

  async estimateFees() {
    const { maxFeePerGas, gasLimit } = await this.rpc.estimateOnboardNativeToVault(
      this.input.source as HexString,
      this.input.balance,
    );

    const gasFeeInCurrency = (maxFeePerGas * gasLimit * 120n) / 100n;
    const curvyFeeInCurrency = ((this.input.balance - gasFeeInCurrency) * BigInt(DEPOSIT_TO_VAULT_FEE)) / 1000n;

    return {
      gasFeeInCurrency,
      curvyFeeInCurrency,
      gasLimit,
      maxFeePerGas,
    };
  }

  async execute(): Promise<CurvyCommandData> {
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const { gasLimit, maxFeePerGas, gasFeeInCurrency } = this.estimate;
    await this.rpc.onboardNativeToVault(this.grossAmount - gasFeeInCurrency, privateKey, maxFeePerGas, gasLimit);

    return this.getResultingBalanceEntry();
  }
}

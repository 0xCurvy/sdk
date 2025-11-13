import dayjs from "dayjs";
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

  async execute(): Promise<CurvyCommandData> {
    const currencyAddress = this.input.currencyAddress;

    if (!this.estimateData) {
      throw new Error("[VaultWithdrawToEoaCommand] Command must be estimated before execution!");
    }
    const { id, gas, curvyFee } = this.estimateData;

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
        if (res === "failed") throw new Error(`[VaultWithdrawToEoaCommand] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    await this.sdk.storage.removeSpentBalanceEntries("address", [this.input]);

    await new Promise((res) => setTimeout(res, 3000)); // Wait for balances to be updated properly

    const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
    await this.sdk.refreshAddressBalances(curvyAddress);

    return {
      type: BALANCE_TYPE.SA,
      walletId: "PLACEHOLDER", // TODO Remove
      source: this.#intent.toAddress as HexString,
      networkSlug: this.input.networkSlug,
      environment: this.input.environment,
      balance: effectiveAmount,
      symbol: this.input.symbol,
      decimals: this.input.decimals,
      currencyAddress,
      lastUpdated: +dayjs(), // TODO Remove
      createdAt: "PLACEHOLDER", // TODO Remove
    } satisfies SaBalanceEntry;
  }

  async estimate(): Promise<VaultWithdrawToEOACommandEstimate> {
    const currencyAddress = this.input.currencyAddress;

    const { id, gasFeeInCurrency } = await this.estimateGas();

    const gas = BigInt(gasFeeInCurrency ?? "0");
    const curvyFee = BigInt(curvyFeeInCurrency ?? "0");

    return {
      gas,
      curvyFee,
      id,
      data: {
        type: BALANCE_TYPE.SA,
        source: this.#intent.toAddress as HexString,
        networkSlug: this.input.networkSlug,
        environment: this.input.environment,
        balance: this.input.balance - curvyFee - gas,
        symbol: this.input.symbol,
        decimals: this.input.decimals,
        currencyAddress,
      },
    };
  }
}

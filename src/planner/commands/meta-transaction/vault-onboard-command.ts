import { privateKeyToAccount } from "viem/accounts";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractMetaTransactionCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type HexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type SaBalanceEntry,
  type VaultBalanceEntry,
} from "@/types";

interface VaultOnboardCommandEstimate extends CurvyCommandEstimate {
  id: string;
  data: VaultBalanceEntry;
}

// This command automatically sends all available balance from a stealth address to vault
export class VaultOnboardCommand extends AbstractMetaTransactionCommand {
  declare estimateData: VaultOnboardCommandEstimate | undefined;
  declare input: SaBalanceEntry;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    this.validateInput(this.input);
  }

  get name(): string {
    return "VaultOnboardErc20Command";
  }

  get metaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_ONBOARD;
  }

  validateInput(input: SaBalanceEntry | VaultBalanceEntry): asserts input is SaBalanceEntry {
    if (input.type !== BALANCE_TYPE.SA) {
      throw new Error(
        "Invalid input for command, VaultDepositToAggregatorCommand only accept Sa balance type as input.",
      );
    }
  }

  async getResultingBalanceEntry(estimationParams?: {
    gasFeeInCurrency: bigint;
    curvyFeeInCurrency: bigint;
  }): Promise<VaultBalanceEntry> {
    const { vaultTokenId } =
      this.network.currencies.find((c) => c.contractAddress === this.input.currencyAddress) || {};

    if (!vaultTokenId) {
      throw new Error(
        `[SaVaultOnboardCommand] vaultTokenId is not defined for currency ${this.input.currencyAddress} on network ${this.input.networkSlug}`,
      );
    }

    const _gasFeeInCurrency = estimationParams?.gasFeeInCurrency ?? this.estimateData?.gasFeeInCurrency;
    const _curvyFeeInCurrency = estimationParams?.curvyFeeInCurrency ?? this.estimateData?.curvyFeeInCurrency;

    const { createdAt: _, ...inputData } = this.input;

    let _balance: bigint;

    if (estimationParams) {
      _balance = this.input.balance - (_gasFeeInCurrency ?? 0n) - (_curvyFeeInCurrency ?? 0n);
    } else {
      const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
      const { balances } = await this.rpc.getVaultBalances(curvyAddress.address);

      const vaultBalance = balances.find((b) => b.currencyAddress === this.input.currencyAddress);

      if (!vaultBalance) {
        throw new Error("Failed to retrieve Vault balance after deposit!");
      }

      _balance = vaultBalance.balance;
    }

    return {
      ...inputData,
      vaultTokenId: BigInt(vaultTokenId),
      balance: _balance,
      type: BALANCE_TYPE.VAULT,
    } satisfies VaultBalanceEntry;
  }

  async execute(): Promise<CurvyCommandData> {
    if (!this.estimateData) {
      throw new Error("[SaVaultOnboardCommand] Command must be estimated before execution!");
    }

    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const { id } = this.estimateData;

    const signedAuthorization = await this.rpc.walletClient.signAuthorization({
      account: privateKeyToAccount(privateKey),
      contractAddress: this.network.tokenMoverContractAddress as HexString,
    });

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({
      id,
      signature: JSON.stringify(signedAuthorization),
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`[SaOnboardToVault] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    return this.getResultingBalanceEntry();
  }

  async estimate(): Promise<VaultOnboardCommandEstimate> {
    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await super.estimate();

    const vaultBalanceEntry = await this.getResultingBalanceEntry({ gasFeeInCurrency, curvyFeeInCurrency });

    return {
      id,
      gasFeeInCurrency,
      curvyFeeInCurrency,
      data: vaultBalanceEntry,
    };
  }
}

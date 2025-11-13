import { privateKeyToAccount } from "viem/accounts";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractStealthAddressCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type BalanceEntry,
  type HexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type VaultBalanceEntry,
} from "@/types";

interface VaultOnboardCommandEstimate extends CurvyCommandEstimate {
  id: string;
  data: VaultBalanceEntry;
  maxFeePerGas?: bigint;
  gasLimit?: bigint;
}

// TODO: Move to config, even better read from RPC
const DEPOSIT_TO_VAULT_FEE = 1;

// This command automatically sends all available balance from a stealth address to vault
export class VaultOnboardCommand extends AbstractStealthAddressCommand {
  protected declare estimateData: VaultOnboardCommandEstimate | undefined;

  getMetaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_ONBOARD;
  }

  async getResultingBalanceEntry(): Promise<BalanceEntry> {
    const { createdAt: _, ...inputData } = this.input;

    const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
    const { balances } = await this.rpc.getVaultBalances(curvyAddress.address);

    const vaultBalance = balances.find((b) => b.currencyAddress === this.input.currencyAddress);

    if (!vaultBalance) {
      throw new Error("Failed to retrieve Vault balance after deposit!");
    }

    return {
      ...inputData,
      vaultTokenId: vaultBalance.vaultTokenId,
      balance: BigInt(vaultBalance.balance),
      type: BALANCE_TYPE.VAULT,
    } satisfies VaultBalanceEntry;
  }

  async execute(): Promise<CurvyCommandData> {
    const { native: isOnboardingNative } = await this.sdk.storage.getCurrencyMetadata(
      this.input.currencyAddress,
      this.input.networkSlug,
    );

    const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(curvyAddress);

    if (!this.estimateData) {
      throw new Error("[SaVaultOnboardCommand] Command must be estimated before execution!");
    }

    const { id, gasLimit, maxFeePerGas } = this.estimateData;

    if (isOnboardingNative) {
      await this.rpc.onboardNativeToVault(this.getNetAmount(), privateKey, maxFeePerGas!, gasLimit!);
    } else {
      if (id === null) {
        throw new Error("[SaVaultOnboardCommand] Meta transaction ID is null for non-native onboarding!");
      }

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
    }

    await this.sdk.storage.removeSpentBalanceEntries("address", [this.input]);

    return this.getResultingBalanceEntry();
  }

  async estimate(): Promise<VaultOnboardCommandEstimate> {
    const { native: isOnboardingNative, vaultTokenId } = await this.sdk.storage.getCurrencyMetadata(
      this.input.currencyAddress,
      this.input.networkSlug,
    );

    if (!vaultTokenId) {
      throw new Error(
        `[SaVaultOnboardCommand] vaultTokenId is not defined for currency ${this.input.currencyAddress} on network ${this.input.networkSlug}`,
      );
    }

    const { createdAt: _, ...inputData } = this.input;

    const vaultBalanceEntry = {
      ...inputData,
      vaultTokenId: BigInt(vaultTokenId),
      balance: inputData.balance,
      type: BALANCE_TYPE.VAULT,
    } satisfies VaultBalanceEntry;

    if (isOnboardingNative) {
      const { maxFeePerGas, gasLimit } = await this.rpc.estimateOnboardNativeToVault(
        this.input.source as HexString,
        this.input.balance,
      );
      const gasFeeInCurrency = (maxFeePerGas * gasLimit * 120n) / 100n;
      const curvyFeeInCurrency = ((this.input.balance - gasFeeInCurrency) * BigInt(DEPOSIT_TO_VAULT_FEE)) / 1000n;

      // TODO: Move this out of the commands
      vaultBalanceEntry.balance -= gasFeeInCurrency;
      vaultBalanceEntry.balance -= curvyFeeInCurrency;

      return {
        curvyFeeInCurrency,
        gasFeeInCurrency,
        id: "",
        data: vaultBalanceEntry,
        maxFeePerGas,
        gasLimit,
      };
    }

    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await super.estimate();

    vaultBalanceEntry.balance -= BigInt(gasFeeInCurrency ?? "0") + BigInt(curvyFeeInCurrency ?? "0");

    return {
      id,
      gasFeeInCurrency,
      curvyFeeInCurrency,
      data: vaultBalanceEntry,
    };
  }
}

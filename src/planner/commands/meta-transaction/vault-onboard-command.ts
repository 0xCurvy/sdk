import { encodeFunctionData, erc20Abi, type PublicClient } from "viem";
import { vaultV1Abi } from "@/contracts/evm/abi";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractStealthAddressCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import type { Rpc } from "@/rpc/abstract";
import { BALANCE_TYPE, type HexString, META_TRANSACTION_TYPES, type VaultBalanceEntry } from "@/types";

interface VaultOnboardCommandEstimate extends CurvyCommandEstimate {
  id: string | null;
  data: VaultBalanceEntry;
}

// TODO: Move to config, even better read from RPC
const DEPOSIT_TO_VAULT_FEE = 1;

// This command automatically sends all available balance from a stealth addresss to vault
export class VaultOnboardCommand extends AbstractStealthAddressCommand {
  #rpc: Rpc;
  #provider: PublicClient;
  protected declare estimateData: VaultOnboardCommandEstimate | undefined;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);
    this.#rpc = this.sdk.rpcClient.Network(this.input.networkSlug);
    this.#provider = this.#rpc.provider;
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

    const { id, gas } = this.estimateData;

    if (isOnboardingNative) {
      await this.#rpc.onboardNativeToVault(this.input.balance - gas, privateKey, gas);
    } else {
      if (id === null) {
        throw new Error("[SaVaultOnboardCommand] Meta transaction ID is null for non-native onboarding!");
      }

      const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
      const privateKey = await this.sdk.walletManager.getAddressPrivateKey(curvyAddress);

      // approval = approvujemo ceo erc20 balans na erc20 kontraktu da moze njime da raspolaze vault
      const approvalTransaction = await this.#provider.prepareTransactionRequest({
        to: this.input.currencyAddress as HexString,
        gas: 60_000n,
        nonce: 0,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [
            this.network.vaultContractAddress as HexString,
            this.input.balance, // Approve entire balance
          ],
        }),
        chain: this.#provider.chain,
      });

      const signedApprovalTransaction = await this.#rpc.signRawTransaction(privateKey, approvalTransaction);

      const depositTransaction = await this.#provider.prepareTransactionRequest({
        to: this.network.vaultContractAddress as HexString,
        gas: 125_000n,
        nonce: 1,
        data: encodeFunctionData({
          abi: vaultV1Abi,
          functionName: "deposit",
          args: [this.input.currencyAddress as HexString, this.input.source, this.input.balance, gas],
        }),
        chain: this.#provider.chain,
      });

      const signedDepositTransaction = await this.#rpc.signRawTransaction(privateKey, depositTransaction);

      await this.sdk.apiClient.metaTransaction.SubmitTransaction({
        id,
        signature: [signedApprovalTransaction, signedDepositTransaction].join(","),
      });
      await this.sdk.pollForCriteria(
        () => this.sdk.apiClient.metaTransaction.GetStatus(id),
        (res) => {
          if (res === "failed") throw new Error(`[SaOnboardToVault] Meta-transaction execution failed!`);
          return res === "completed";
        },
      );
    }

    const { createdAt: _, ...inputData } = this.input;

    const { balances } = await this.#rpc.getVaultBalances(curvyAddress.address);

    const vaultBalance = balances.find((b) => b.currencyAddress === this.input.currencyAddress);

    if (!vaultBalance) {
      throw new Error("Failed to retrieve Vault balance after deposit!");
    }

    const vaultBalanceEntry = {
      ...inputData,
      vaultTokenId: vaultBalance.vaultTokenId,
      balance: BigInt(vaultBalance.balance),
      type: BALANCE_TYPE.VAULT,
    } satisfies VaultBalanceEntry;

    return vaultBalanceEntry;
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
      const gas = await this.#rpc.estimateOnboardNativeToVault(this.input.source as HexString, this.input.balance);
      const curvyFee = ((this.input.balance - gas) * BigInt(DEPOSIT_TO_VAULT_FEE)) / 1000n;

      // TODO: Move this out of the commands
      vaultBalanceEntry.balance -= gas + curvyFee;

      return { curvyFee, gas, id: null, data: vaultBalanceEntry };
    }

    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await this.sdk.apiClient.metaTransaction.EstimateGas({
      amount: this.input.balance.toString(),
      currencyAddress: this.input.currencyAddress,
      fromAddress: this.input.source,
      network: this.input.networkSlug,
      type: META_TRANSACTION_TYPES.VAULT_ONBOARD,
      toAddress: this.input.source,
    });

    vaultBalanceEntry.balance -= BigInt(gasFeeInCurrency ?? "0") + BigInt(curvyFeeInCurrency ?? "0");

    return {
      id,
      gas: BigInt(gasFeeInCurrency ?? "0"),
      curvyFee: BigInt(curvyFeeInCurrency ?? "0"),
      data: vaultBalanceEntry,
    };
  }
}

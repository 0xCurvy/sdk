import { encodeFunctionData, erc20Abi, type PublicClient } from "viem";
import { erc1155ABI } from "@/contracts/evm/abi";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { SACommand } from "@/planner/commands/sa/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import type { Rpc } from "@/rpc/abstract";
import { BALANCE_TYPE, type Erc1155BalanceEntry, type HexString, META_TRANSACTION_TYPES } from "@/types";

// This command automatically sends all available balance from SA to CSUC address
export class SaErc1155OnboardCommand extends SACommand {
  #rpc: Rpc;
  #provider: PublicClient;

  constructor(sdk: ICurvySDK, input: CurvyCommandData) {
    super(sdk, input);
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

    const { gas, curvyFee, id } = await this.estimate();
    const amount = this.input.balance - curvyFee - gas;

    if (isOnboardingNative) {
      await this.#rpc.onboardNativeToErc1155(amount, privateKey);
    } else {
      if (id === null) {
        throw new Error("[SaErc1155OnboardCommand] Meta transaction ID is null for non-native onboarding!");
      }

      const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
      const privateKey = await this.sdk.walletManager.getAddressPrivateKey(curvyAddress);

      // approval = approvujemo ceo erc20 balans na erc20 kontraktu da moze njime da raspolaze erc1155
      const approvalTransaction = await this.#provider.prepareTransactionRequest({
        to: this.input.currencyAddress as HexString,
        gas: 50_000n,
        nonce: 0,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [
            this.network.erc1155ContractAddress as HexString,
            this.input.balance, // Approve entire balance
          ],
        }),
        chain: this.#provider.chain,
      });

      const signedApprovalTransaction = await this.#rpc.signRawTransaction(privateKey, approvalTransaction);

      const depositTransaction = await this.#provider.prepareTransactionRequest({
        to: this.network.erc1155ContractAddress as HexString,
        gas: 80_000n,
        nonce: 1,
        data: encodeFunctionData({
          abi: erc1155ABI,
          functionName: "deposit",
          args: [this.input.currencyAddress as HexString, this.input.source, this.input.balance],
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
          if (res === "failed") throw new Error(`[SaOnboardToERC1155] Meta-transaction execution failed!`);
          return res === "completed";
        },
      );
    }

    const { createdAt: _, ...inputData } = this.input;

    const { balances } = await this.#rpc.getErc1155Balances(curvyAddress.address);

    const erc1155Balance = balances.find((b) => b.currencyAddress === this.input.currencyAddress);

    if (!erc1155Balance) {
      throw new Error("Failed to retrieve ERC1155 balance after deposit!");
    }

    const erc1155BalanceEntry = {
      ...inputData,
      erc1155TokenId: erc1155Balance.erc1155TokenId,
      balance: BigInt(erc1155Balance.balance),
      type: BALANCE_TYPE.ERC1155,
    } satisfies Erc1155BalanceEntry;

    await this.sdk.storage.updateBalancesAndTotals(inputData.walletId, [erc1155BalanceEntry]);

    return erc1155BalanceEntry;
  }

  async estimate(): Promise<CurvyCommandEstimate & { id: string | null }> {
    const { native: isOnboardingNative } = await this.sdk.storage.getCurrencyMetadata(
      this.input.currencyAddress,
      this.input.networkSlug,
    );

    if (isOnboardingNative) {
      const gas = await this.#rpc.estimateOnboardNativeToErc1155(this.input.source as HexString, this.input.balance);

      return { curvyFee: 0n, gas, id: null };
    } else {
      const { id, gasFeeInCurrency, curvyFeeInCurrency } = await this.sdk.apiClient.metaTransaction.EstimateGas({
        amount: this.input.balance.toString(),
        currencyAddress: this.input.currencyAddress,
        fromAddress: this.input.source,
        network: this.input.networkSlug,
        type: META_TRANSACTION_TYPES.ERC1155_ONBOARD,
        toAddress: this.input.source,
      });
      return { id, gas: BigInt(gasFeeInCurrency ?? "0"), curvyFee: BigInt(curvyFeeInCurrency ?? "0") };
    }
  }
}

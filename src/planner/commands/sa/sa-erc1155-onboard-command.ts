import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { SACommand } from "@/planner/commands/sa/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import type { Rpc } from "@/rpc/abstract";
import { BALANCE_TYPE, type Erc1155BalanceEntry, type HexString } from "@/types";

// This command automatically sends all available balance from SA to CSUC address
export class SaErc1155OnboardCommand extends SACommand {
  #rpc: Rpc;

  constructor(sdk: ICurvySDK, input: CurvyCommandData) {
    super(sdk, input);
    this.#rpc = this.sdk.rpcClient.Network(this.input.networkSlug);
  }

  async execute(): Promise<CurvyCommandData> {
    const { native: isOnboardingNative } = await this.sdk.storage.getCurrencyMetadata(
      this.input.currencyAddress,
      this.input.networkSlug,
    );

    const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
    const privateKey = this.sdk.walletManager.getAddressPrivateKey(curvyAddress);

    const { gas, curvyFee } = await this.estimate();
    const amount = this.input.balance - curvyFee - gas;

    if (isOnboardingNative) {
      await this.#rpc.onboardNativeToErc1155(amount, privateKey);
    } else {
      // const result = await this.sdk.apiClient.submit(amount, ...)
      await this.sdk.pollForCriteria(
        () => Promise.resolve(true),
        (res) => res,
        120,
        10_000,
      );
    }

    const { createdAt: _, ...inputData } = this.input;

    const { balances } = await this.#rpc.getErc1155Balances(curvyAddress);
    const erc1155Balance = balances.find((b) => b.currencyAddress === this.input.currencyAddress);

    if (!erc1155Balance) {
      throw new Error("Failed to retrieve ERC1155 balance after deposit!");
    }

    return {
      ...inputData,
      balance: BigInt(erc1155Balance.balance),
      type: BALANCE_TYPE.ERC1155,
    } satisfies Erc1155BalanceEntry;
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    const { native: isOnboardingNative } = await this.sdk.storage.getCurrencyMetadata(
      this.input.currencyAddress,
      this.input.networkSlug,
    );

    if (isOnboardingNative) {
      const gas = await this.#rpc.estimateOnboardNativeToErc1155(this.input.source as HexString, this.input.balance);

      return { curvyFee: 0n, gas };
    } else {
      // this.sdk.apiClient.metaTransaction.estimate();
      return { curvyFee: 0n, gas: 0n };
    }
  }
}

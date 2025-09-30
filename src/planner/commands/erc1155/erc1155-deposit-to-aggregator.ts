import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractErc1155Command } from "@/planner/commands/erc1155/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { type HexString, META_TRANSACTION_TYPES, type Note } from "@/types";

// This command automatically sends all available balance from ERC1155 to Aggregator
export class Erc1155DepositToAggregatorCommand extends AbstractErc1155Command {
  async execute(): Promise<CurvyCommandData> {
    const { /*id, */ gas, curvyFee, note } = await this.estimate();

    note.balance!.amount = this.input.balance - curvyFee - gas;

    // TODO: Re-enable meta transaction submission for deposits
    // ========================================================
    // await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature: "" });

    // await this.sdk.pollForCriteria(
    //   () => this.sdk.apiClient.metaTransaction.GetStatus(id),
    //   (res) => {
    //     return res === "completed";
    //   },
    //   120,
    //   10000,
    // );

    // const { erc1155ContractAddress } = this.network;

    // if (!erc1155ContractAddress) {
    //   throw new Error(`CSUC contract address not found for ${this.network.name} network.`);
    // }

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitDeposit({
      outputNotes: [note.serializeDepositNote()],
      fromAddress: this.input.source,
      // TODO: Re-enable signature validation for deposits
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "success";
      },
      120,
      10000,
    );

    return note.toBalanceEntry(
      this.input.symbol,
      this.input.decimals,
      this.input.walletId,
      this.input.environment,
      this.input.networkSlug,
      this.input.currencyAddress as HexString,
    );
  }

  async estimate(): Promise<CurvyCommandEstimate & { id: string; note: Note }> {
    const currencyAddress = this.input.currencyAddress;

    if (!this.input.erc1155TokenId) {
      throw new Error("Erc1155DepositToAggregatorCommand: erc1155TokenId is required");
    }

    const note = await this.sdk.getNewNoteForUser(
      this.senderCurvyHandle,
      this.input.erc1155TokenId,
      this.input.balance,
    );

    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await this.sdk.apiClient.metaTransaction.EstimateGas({
      type: META_TRANSACTION_TYPES.ERC1155_DEPOSIT_TO_AGGREGATOR,
      currencyAddress,
      amount: this.input.balance.toString(),
      fromAddress: this.input.source,
      network: this.input.networkSlug,
      ownerHash: note.ownerHash.toString(16),
    });

    return {
      gas: BigInt(gasFeeInCurrency ?? "0"),
      curvyFee: BigInt(curvyFeeInCurrency ?? "0"),
      id,
      note,
    };
  }
}

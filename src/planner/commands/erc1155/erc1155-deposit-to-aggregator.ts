import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractErc1155Command } from "@/planner/commands/erc1155/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { type HexString, META_TRANSACTION_TYPES, type Note, type NoteBalanceEntry } from "@/types";
import { noteToBalanceEntry } from "@/utils";

interface Erc1155DepositToAggregatorCommandEstimate extends CurvyCommandEstimate {
  id: string;
  note: Note;
  data: NoteBalanceEntry;
}

// This command automatically sends all available balance from ERC1155 to Aggregator
export class Erc1155DepositToAggregatorCommand extends AbstractErc1155Command {
  protected declare estimateData: Erc1155DepositToAggregatorCommandEstimate | undefined;

  // biome-ignore lint/complexity/noUselessConstructor: Abstract class constructor is protected
  constructor(sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(sdk, input, estimate);
  }

  async execute(): Promise<CurvyCommandData> {
    if (!this.estimateData) {
      throw new Error("[Erc1155DepositToAggregatorCommand] Command must be estimated before execution!");
    }

    const { /*id,*/ gas, curvyFee, note } = this.estimateData;

    note.balance!.amount = this.input.balance - curvyFee - gas;

    // TODO: Re-enable meta transaction submission for deposits
    // ========================================================
    // await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature: "" });

    // await this.sdk.pollForCriteria(
    //   () => this.sdk.apiClient.metaTransaction.GetStatus(id),
    //   (res) => {
    //     return res === "completed";
    //   },
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
        if (res.status === "failed") {
          throw new Error(`[DepositToAggregatorCommand] Aggregator deposit failed!`);
        }
        return res.status === "success";
      },
    );

    return noteToBalanceEntry(note, {
      symbol: this.input.symbol,
      decimals: this.input.decimals,
      walletId: this.input.walletId,
      environment: this.input.environment,
      networkSlug: this.input.networkSlug,
      currencyAddress: this.input.currencyAddress as HexString,
    });
  }

  async estimate(): Promise<Erc1155DepositToAggregatorCommandEstimate> {
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

    const gas = BigInt(gasFeeInCurrency ?? "0");
    const curvyFee = BigInt(curvyFeeInCurrency ?? "0");

    return {
      gas,
      curvyFee,
      id,
      note,
      data: noteToBalanceEntry(note, {
        symbol: this.input.symbol,
        decimals: this.input.decimals,
        walletId: this.input.walletId,
        environment: this.input.environment,
        networkSlug: this.input.networkSlug,
        currencyAddress: this.input.currencyAddress as HexString,
      }),
    };
  }
}

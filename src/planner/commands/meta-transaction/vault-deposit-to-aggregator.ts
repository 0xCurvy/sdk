import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractVaultCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import type { HexString, MetaTransactionType, Note, NoteBalanceEntry } from "@/types";
import { noteToBalanceEntry } from "@/utils";
import { toSlug } from "@/utils/helpers";

interface VaultDepositToAggregatorCommandEstimate extends CurvyCommandEstimate {
  id: string;
  data: NoteBalanceEntry;

  note: Note;
}

// This command automatically sends all available balance from Vault to Aggregator
export class VaultDepositToAggregatorCommand extends AbstractVaultCommand {
  protected declare estimateData: VaultDepositToAggregatorCommandEstimate | undefined;

  // biome-ignore lint/complexity/noUselessConstructor: Abstract class constructor is protected
  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);
  }

  getMetaTransactionType(): MetaTransactionType {
    throw new Error("Method not implemented.");
  }

  getToAddress(): HexString {
    throw new Error("Method not implemented.");
  }

  async execute(): Promise<CurvyCommandData> {
    if (!this.estimateData) {
      throw new Error("[VaultDepositToAggregatorCommand] Command must be estimated before execution!");
    }

    const { id, gasFeeInCurrency, curvyFeeInCurrency, note } = this.estimateData;

    if (this.input.balance !== note.balance!.amount) {
      throw new Error("[VaultDepositToAggregatorCommand] Mismatch between actual and estimated balance.");
    }

    note.balance!.amount = this.input.balance - curvyFeeInCurrency - gasFeeInCurrency;

    const signature = await this.signMetaTransaction(this.network.aggregatorContractAddress as HexString);
    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`[VaultDepositToAggregatorCommand] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    for (let i = 0; i < 3; i++) {
      if (await this.rpc.isNoteDeposited(note.id)) break;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitDeposit({
      networkSlug: toSlug(this.network.name),
      outputNotes: [note.serializeOutputNote()],
      fromAddress: this.input.source,
      networkId: this.network.id,
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "success";
      },
    );

    await this.sdk.storage.removeSpentBalanceEntries("address", [this.input]);

    return noteToBalanceEntry(note, {
      symbol: this.input.symbol,
      decimals: this.input.decimals,
      walletId: this.input.walletId,
      environment: this.input.environment,
      networkSlug: this.input.networkSlug,
      currencyAddress: this.input.currencyAddress as HexString,
    });
  }

  async getResultingBalanceEntry() {
    // Zasto note ne umanjujemo da bude netAmount, vec je input.balance?? Pogledati develop ili main verziju ovoga
    const note = await this.sdk.getNewNoteForUser(this.senderCurvyHandle, this.input.vaultTokenId, this.input.balance);
    return noteToBalanceEntry(note, {
      symbol: this.input.symbol,
      decimals: this.input.decimals,
      walletId: this.input.walletId,
      environment: this.input.environment,
      networkSlug: this.input.networkSlug,
      currencyAddress: this.input.currencyAddress as HexString,
    });
  }

  async estimate(): Promise<VaultDepositToAggregatorCommandEstimate> {
    if (!this.input.vaultTokenId) {
      throw new Error("VaultDepositToAggregatorCommand: vaultTokenId is required");
    }

    const { id, gasFeeInCurrency } = await super.estimate();
    const curvyFeeInCurrency = await this.calculateCurvyFee();

    const note = await this.sdk.getNewNoteForUser(this.senderCurvyHandle, this.input.vaultTokenId, this.input.balance);

    return {
      gasFeeInCurrency,
      curvyFeeInCurrency,
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

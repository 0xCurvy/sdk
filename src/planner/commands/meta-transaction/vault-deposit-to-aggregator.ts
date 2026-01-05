import {
  AbstractVaultMetaTransactionCommand,
  type MetaTransactionCommandEstimateWithNote,
} from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { type HexString, META_TRANSACTION_TYPES, type MetaTransactionType, type NoteBalanceEntry } from "@/types";
import { noteToBalanceEntry } from "@/utils";
import { pollForCriteria, toSlug } from "@/utils/helpers";

// This command automatically sends all available balance from Vault to Aggregator
export class VaultDepositToAggregatorCommand extends AbstractVaultMetaTransactionCommand {
  declare estimate: MetaTransactionCommandEstimateWithNote;

  get name(): string {
    return "VaultDepositToAggregatorCommand";
  }

  get metaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_DEPOSIT_TO_AGGREGATOR;
  }

  override async estimateFees(): Promise<MetaTransactionCommandEstimateWithNote> {
    const note = await this.sdk.generateNewNote(this.senderCurvyHandle, this.input.vaultTokenId, this.input.balance);

    const { gasFeeInCurrency, id: estimateId } = await this.calculateGasFee({ ownerHash: note.ownerHash });
    const curvyFeeInCurrency = await this.calculateCurvyFee();

    this.estimate = {
      gasFeeInCurrency,
      estimateId,
      curvyFeeInCurrency,
      note,
    };

    return this.estimate;
  }

  async getResultingBalanceEntry(): Promise<NoteBalanceEntry> {
    return noteToBalanceEntry(this.estimate.note, {
      symbol: this.input.symbol,
      decimals: this.input.decimals,
      walletId: this.input.walletId,
      environment: this.input.environment,
      networkSlug: this.input.networkSlug,
      currencyAddress: this.input.currencyAddress as HexString,
    });
  }

  async execute(): Promise<CurvyCommandData> {
    const { estimateId: id } = this.estimate;

    const signature = await this.signMetaTransaction(this.network.aggregatorContractAddress as HexString);
    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`[VaultDepositToAggregatorCommand] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitDeposit({
      networkSlug: toSlug(this.network.name),
      outputNotes: [this.estimate.note.serializeOutputNote()],
      fromAddress: this.input.source,
      networkId: this.network.id,
    });

    await pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "success";
      },
    );

    return this.getResultingBalanceEntry();
  }
}

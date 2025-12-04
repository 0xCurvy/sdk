import {
  AbstractVaultMetaTransactionCommand,
  type MetaTransactionCommandEstimate,
} from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  type HexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type Note,
  type NoteBalanceEntry,
} from "@/types";
import { noteToBalanceEntry } from "@/utils";
import { toSlug } from "@/utils/helpers";

// This command automatically sends all available balance from Vault to Aggregator
export class VaultDepositToAggregatorCommand extends AbstractVaultMetaTransactionCommand {
  get name(): string {
    return "VaultDepositToAggregatorCommand";
  }

  get metaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_DEPOSIT_TO_AGGREGATOR;
  }

  async #createDepositNote() {
    if (!this.estimateData.sharedSecret) {
      throw new Error("[VaultDepositToAggregatorCommand] Invalid estimate data!");
    }

    const note = await this.sdk.getNewNoteForUser(this.senderCurvyHandle, this.input.vaultTokenId, this.input.balance);
    note.sharedSecret = this.estimateData.sharedSecret;

    return note;
  }

  override async estimateFees(): Promise<MetaTransactionCommandEstimate> {
    const { ownerHash, owner } = await this.sdk.getNewNoteForUser(
      this.senderCurvyHandle,
      this.input.vaultTokenId,
      this.input.balance,
    );

    const { gasFeeInCurrency, id: estimateId } = await this.calculateGasFee(ownerHash);
    const curvyFeeInCurrency = await this.calculateCurvyFee();

    return { gasFeeInCurrency, estimateId, curvyFeeInCurrency, sharedSecret: owner?.sharedSecret };
  }

  async getResultingBalanceEntry(executionData?: { note: Note }): Promise<NoteBalanceEntry> {
    const _note = executionData?.note ?? (await this.#createDepositNote());

    return noteToBalanceEntry(_note, {
      symbol: this.input.symbol,
      decimals: this.input.decimals,
      walletId: this.input.walletId,
      environment: this.input.environment,
      networkSlug: this.input.networkSlug,
      currencyAddress: this.input.currencyAddress as HexString,
    });
  }

  async execute(): Promise<CurvyCommandData> {
    const { estimateId: id } = this.estimateData;

    const signature = await this.signMetaTransaction(this.network.aggregatorContractAddress as HexString);
    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`[VaultDepositToAggregatorCommand] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    const note = await this.#createDepositNote();

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

    return this.getResultingBalanceEntry({ note });
  }
}

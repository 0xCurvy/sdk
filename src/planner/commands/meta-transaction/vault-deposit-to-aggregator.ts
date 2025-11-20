import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractMetaTransactionCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type HexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type Note,
  type NoteBalanceEntry,
  type SaBalanceEntry,
  type VaultBalanceEntry,
} from "@/types";
import type { DeepNonNullable } from "@/types/helper";
import { noteToBalanceEntry } from "@/utils";
import { toSlug } from "@/utils/helpers";

// This command automatically sends all available balance from Vault to Aggregator
export class VaultDepositToAggregatorCommand extends AbstractMetaTransactionCommand {
  declare input: DeepNonNullable<VaultBalanceEntry>;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    this.validateInput(this.input);
  }

  override validateInput(input: SaBalanceEntry | VaultBalanceEntry): asserts input is VaultBalanceEntry {
    if (input.type !== BALANCE_TYPE.VAULT) {
      throw new Error(
        "Invalid input for command, VaultDepositToAggregatorCommand only accept Vault balance type as input.",
      );
    }
  }

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

  async getCommandResult(executionData?: { note: Note }): Promise<NoteBalanceEntry> {
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

    return this.getCommandResult({ note });
  }
}

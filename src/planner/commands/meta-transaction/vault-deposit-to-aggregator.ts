import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractVaultCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { EvmRpc } from "@/rpc";
import { type HexString, META_TRANSACTION_TYPES, type Note, type NoteBalanceEntry } from "@/types";
import { noteToBalanceEntry } from "@/utils";
import { toSlug } from "@/utils/helpers";

interface VaultDepositToAggregatorCommandEstimate extends CurvyCommandEstimate {
  id: string;
  note: Note;
  data: NoteBalanceEntry;
}

// This command automatically sends all available balance from Vault to Aggregator
export class VaultDepositToAggregatorCommand extends AbstractVaultCommand {
  protected declare estimateData: VaultDepositToAggregatorCommandEstimate | undefined;

  // biome-ignore lint/complexity/noUselessConstructor: Abstract class constructor is protected
  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);
  }

  async execute(): Promise<CurvyCommandData> {
    const rpc = this.sdk.rpcClient.Network(this.network.name);

    if (!this.estimateData) {
      throw new Error("[VaultDepositToAggregatorCommand] Command must be estimated before execution!");
    }

    const { id, gas, curvyFee, note } = this.estimateData;

    // TODO: getNewNoteForUser should return output note
    note.balance!.amount = this.input.balance - curvyFee - gas;

    const signature = await this.signMetaTransaction(
      this.network.aggregatorContractAddress as HexString,
      note.balance!.amount,
      gas,
      META_TRANSACTION_TYPES.VAULT_DEPOSIT_TO_AGGREGATOR,
    );
    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`[VaultDepositToAggregatorCommand] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    if (!(rpc instanceof EvmRpc)) {
      throw new Error("VaultDepositToAggregatorCommand: Only EVM networks are supported");
    }

    for (let i = 0; i < 3; i++) {
      if (await rpc.isNoteDeposited(note.id)) break;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitDeposit({
      networkSlug: toSlug(this.network.name),
      outputNotes: [note.serializeOutputNote()],
      fromAddress: this.input.source,
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
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

  async estimate(): Promise<VaultDepositToAggregatorCommandEstimate> {
    const currencyAddress = this.input.currencyAddress;

    if (!this.input.vaultTokenId) {
      throw new Error("VaultDepositToAggregatorCommand: vaultTokenId is required");
    }

    const note = await this.sdk.getNewNoteForUser(this.senderCurvyHandle, this.input.vaultTokenId, this.input.balance);

    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await this.sdk.apiClient.metaTransaction.EstimateGas({
      type: META_TRANSACTION_TYPES.VAULT_DEPOSIT_TO_AGGREGATOR,
      currencyAddress,
      amount: this.input.balance.toString(),
      fromAddress: this.input.source,
      // biome-ignore lint/style/noNonNullAssertion: it's checked for in the abstract class constructor
      toAddress: this.network.aggregatorContractAddress!,
      network: this.input.networkSlug,
      ownerHash: `0x${note.ownerHash.toString(16)}`,
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

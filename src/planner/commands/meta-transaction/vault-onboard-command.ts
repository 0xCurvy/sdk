import { privateKeyToAccount } from "viem/accounts";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractMetaTransactionCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type HexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type SaBalanceEntry,
  type VaultBalanceEntry,
} from "@/types";
import type { DeepNonNullable } from "@/types/helper";

// This command automatically sends all available balance from a stealth address to vault
export class VaultOnboardCommand extends AbstractMetaTransactionCommand {
  declare input: DeepNonNullable<SaBalanceEntry>;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    this.validateInput(this.input);
  }

  override validateInput(input: SaBalanceEntry | VaultBalanceEntry): asserts input is SaBalanceEntry {
    if (input.type !== BALANCE_TYPE.SA) {
      throw new Error(
        "Invalid input for command, VaultDepositToAggregatorCommand only accept Sa balance type as input.",
      );
    }
  }

  get name(): string {
    return "VaultOnboardErc20Command";
  }

  get metaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_ONBOARD;
  }

  async getCommandResult(): Promise<VaultBalanceEntry> {
    const { createdAt: _, ...inputData } = this.input;

    return {
      ...inputData,
      balance: await this.getNetAmount(),
      type: BALANCE_TYPE.VAULT,
    } satisfies VaultBalanceEntry;
  }

  async execute(): Promise<CurvyCommandData> {
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const { estimateId: id } = this.estimateData;

    const signedAuthorization = await this.rpc.walletClient.signAuthorization({
      account: privateKeyToAccount(privateKey),
      contractAddress: this.network.tokenMoverContractAddress as HexString,
    });

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({
      id,
      signature: JSON.stringify(signedAuthorization),
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed") throw new Error(`[SaOnboardToVault] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    return this.getCommandResult();
  }
}

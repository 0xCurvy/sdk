import { privateKeyToAccount } from "viem/accounts";
import { AbstractSaMetaTransactionCommand } from "@/planner/commands/meta-transaction/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type HexString,
  META_TRANSACTION_TYPES,
  type MetaTransactionType,
  type VaultBalanceEntry,
} from "@/types";

// This command automatically sends all available balance from a stealth address to vault
export class VaultOnboardCommand extends AbstractSaMetaTransactionCommand {
  get name(): string {
    return "VaultOnboardErc20Command";
  }

  get metaTransactionType(): MetaTransactionType {
    return META_TRANSACTION_TYPES.VAULT_ONBOARD;
  }

  async getResultingBalanceEntry(): Promise<VaultBalanceEntry> {
    const { createdAt: _, ...inputData } = this.input;

    return {
      ...inputData,
      balance: await this.netAmount,
      type: BALANCE_TYPE.VAULT,
    } satisfies VaultBalanceEntry;
  }

  async execute(): Promise<CurvyCommandData> {
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(this.input.source);

    const { estimateId: id } = this.estimate;

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

    return this.getResultingBalanceEntry();
  }
}

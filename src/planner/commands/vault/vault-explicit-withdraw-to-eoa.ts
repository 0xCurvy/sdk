import { toBytes } from "viem";
import { vaultV1Abi } from "@/contracts/evm/abi";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractVaultCommand } from "@/planner/commands/vault/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { type HexString, isHexString, META_TRANSACTION_TYPES } from "@/types";
import { getMetaTransactionEip712HashAndSignedData } from "@/utils/meta-transaction";

// This command automatically sends all available balance from CSUC to external address
export class VaultExplicitWithdrawToEOACommand extends AbstractVaultCommand {
  #intent: CurvyIntent;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent: CurvyIntent) {
    super("explicit-withdraw", sdk, input);

    if (!isHexString(intent.toAddress)) {
      throw new Error("VaultExplicitWithdrawToEOACommand: toAddress MUST be a hex string address");
    }

    if (!isHexString(intent.privateKey)) {
      throw new Error("VaultExplicitWithdrawToEOACommand: toAddress MUST be a hex string address");
    }

    this.#intent = intent;
  }

  async execute(): Promise<CurvyCommandData> {
    const { id, gas, curvyFee } = await this.estimate();
    const rpc = this.sdk.rpcClient.Network(this.input.networkSlug);

    const privateKey = this.#intent.privateKey!;

    const nonce = await rpc.provider.readContract({
      abi: vaultV1Abi,
      address: this.network.vaultContractAddress as HexString,
      functionName: "getNonce",
      args: [this.input.source as HexString],
    });

    const tokenId = await rpc.provider.readContract({
      abi: vaultV1Abi,
      address: this.network.vaultContractAddress as HexString,
      functionName: "getTokenID",
      args: [this.input.currencyAddress as HexString],
    });

    const amount = this.input.balance;

    const totalFees = gas + curvyFee;

    const effectiveAmount = amount - totalFees;

    const [eip712Hash] = getMetaTransactionEip712HashAndSignedData(
      this.input.source as HexString,
      this.#intent.toAddress as HexString,
      tokenId,
      effectiveAmount,
      totalFees,
      nonce,
      this.network.vaultContractAddress as HexString,
      this.network.feeCollectorAddress as HexString,
    );

    const signature = (await this.sdk.rpcClient
      .Network(this.input.networkSlug)
      .signMessage(privateKey, { message: { raw: toBytes(eip712Hash) } })) as HexString;

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        if (res === "failed")
          throw new Error(`[VaultExplicitWithdrawToEoaCommand] Meta-transaction execution failed!`);
        return res === "completed";
      },
    );

    return {} as any;
  }

  async estimate(): Promise<CurvyCommandEstimate & { id: string }> {
    const currencyAddress = this.input.currencyAddress;

    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await this.sdk.apiClient.metaTransaction.EstimateGas({
      type: META_TRANSACTION_TYPES.vault_WITHDRAW,
      currencyAddress,
      amount: this.input.balance.toString(),
      fromAddress: this.input.source,
      network: this.input.networkSlug,
      toAddress: this.#intent.toAddress,
    });

    return {
      gas: BigInt(gasFeeInCurrency ?? "0"),
      curvyFee: BigInt(curvyFeeInCurrency ?? "0"),
      id,
    };
  }
}

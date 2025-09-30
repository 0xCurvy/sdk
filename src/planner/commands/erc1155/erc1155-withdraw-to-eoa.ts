import dayjs from "dayjs";
import { toBytes } from "viem";
import { erc1155ABI } from "@/contracts/evm/abi";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractErc1155Command } from "@/planner/commands/erc1155/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { BALANCE_TYPE, type HexString, isHexString, META_TRANSACTION_TYPES, type SaBalanceEntry } from "@/types";
import { getMetaTransactionEip712HashAndSignedData } from "@/utils/meta-transaction";

// This command automatically sends all available balance from CSUC to external address
export class Erc1155WithdrawToEOACommand extends AbstractErc1155Command {
  #intent: CurvyIntent;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent: CurvyIntent) {
    super(sdk, input);

    if (!isHexString(intent.toAddress)) {
      throw new Error("CSUCWithdrawFromCommand: toAddress MUST be a hex string address");
    }

    this.#intent = intent;
  }

  async execute(): Promise<CurvyCommandData> {
    const currencyAddress = this.input.currencyAddress;

    console.dir(this, { depth: null });

    const { id, gas, curvyFee } = await this.estimate();
    const rpc = this.sdk.rpcClient.Network(this.input.networkSlug);

    const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
    const privateKey = await this.sdk.walletManager.getAddressPrivateKey(curvyAddress);

    const nonce = await rpc.provider.readContract({
      abi: erc1155ABI,
      address: this.network.erc1155ContractAddress as HexString,
      functionName: "getNonce",
      args: [this.input.source as HexString],
    });

    const tokenId = await rpc.provider.readContract({
      abi: erc1155ABI,
      address: this.network.erc1155ContractAddress as HexString,
      functionName: "getTokenID",
      args: [this.input.currencyAddress as HexString],
    });

    const amount = this.input.balance;

    const totalFees = gas + curvyFee;

    const effectiveAmount = amount - totalFees;

    const [eip712Hash, signData] = getMetaTransactionEip712HashAndSignedData(
      this.input.source as HexString,
      this.#intent.toAddress as HexString,
      tokenId,
      effectiveAmount,
      totalFees,
      nonce,
      this.network.erc1155ContractAddress as HexString,
      this.network.feeCollectorAddress as HexString,
    );

    console.log("source:", this.input.source as HexString);
    console.log("toAddress:", this.#intent.toAddress as HexString);
    console.log("tokenId:", tokenId);
    console.log("effectiveAmount:", effectiveAmount);
    console.log("totalFees:", totalFees);
    console.log("nonce:", nonce);
    console.log("erc1155ContractAddress:", this.network.erc1155ContractAddress as HexString);
    console.log("feeCollectorAddress:", this.network.feeCollectorAddress as HexString);

    console.log("Withdrawing ERC1155 with meta transaction:");
    console.log(eip712Hash, signData);

    const signature = (await this.sdk.rpcClient
      .Network(this.input.networkSlug)
      .signMessage(privateKey, { message: { raw: toBytes(eip712Hash) } })) as HexString;

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        return res === "completed"; // TODO: All end-states must be observed here and errors tackled properly
      },
      120,
      10000,
    );

    return {
      type: BALANCE_TYPE.SA,
      walletId: "PLACEHOLDER", // TODO Remove
      source: this.#intent.toAddress as HexString,
      networkSlug: this.input.networkSlug,
      environment: this.input.environment,
      balance: this.#intent.amount - curvyFee - gas,
      symbol: this.input.symbol,
      decimals: this.input.decimals,
      currencyAddress,
      lastUpdated: +dayjs(), // TODO Remove
      createdAt: "PLACEHOLDER", // TODO Remove
    } satisfies SaBalanceEntry;
  }

  async estimate(): Promise<CurvyCommandEstimate & { id: string }> {
    const currencyAddress = this.input.currencyAddress;

    const { id, gasFeeInCurrency, curvyFeeInCurrency } = await this.sdk.apiClient.metaTransaction.EstimateGas({
      type: META_TRANSACTION_TYPES.ERC1155_WITHDRAW,
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

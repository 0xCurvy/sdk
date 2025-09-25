import dayjs from "dayjs";
import { keccak256 } from "ethers";
import { encodeAbiParameters, encodePacked, parseAbiParameters, toBytes } from "viem";
import { erc1155ABI } from "@/contracts/evm/abi";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractErc1155Command } from "@/planner/commands/erc1155/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { BALANCE_TYPE, type HexString, isHexString, META_TRANSACTION_TYPES, type SaBalanceEntry } from "@/types";

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

    const { id, gas, curvyFee } = await this.estimate();
    const rpc = this.sdk.rpcClient.Network(this.input.networkSlug);

    const curvyAddress = await this.sdk.storage.getCurvyAddress(this.input.source);
    const privateKey = this.sdk.walletManager.getAddressPrivateKey(curvyAddress);

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

    console.log(gas, curvyFee, this.#intent.amount);

    const META_TX_TYPEHASH = "0xce0b514b3931bdbe4d5d44e4f035afe7113767b7db71949271f6a62d9c60f558";
    const encMembers = encodeAbiParameters(parseAbiParameters("bytes32, address, address, uint256, uint256, uint256"), [
      META_TX_TYPEHASH,
      this.input.source as HexString,
      this.#intent.toAddress as HexString,
      tokenId,
      this.#intent.amount - curvyFee - gas,
      1n,
    ]);

    const transferData = "0x";
    const signedData = encodeAbiParameters(parseAbiParameters("bytes"), [transferData]);

    const structHash = keccak256(
      encodePacked(["bytes", "uint256", "bytes32"], [encMembers, nonce, keccak256(signedData) as HexString]),
    ) as HexString;

    const DOMAIN_SEPARATOR_TYPEHASH = "0x035aff83d86937d35b32e04f0ddc6ff469290eef2f1b692d8a815c89404d4749";
    const domainSeparator = keccak256(
      encodeAbiParameters(parseAbiParameters("bytes32, address"), [
        DOMAIN_SEPARATOR_TYPEHASH,
        rpc.network.erc1155ContractAddress as HexString,
      ]),
    ) as HexString;

    const eip712Hash = keccak256(
      encodePacked(["bytes2", "bytes32", "bytes32"], ["0x1901", domainSeparator, structHash]),
    );

    const signature = (await this.sdk.rpcClient
      .Network(this.input.networkSlug)
      .signMessage(privateKey, { message: { raw: toBytes(eip712Hash) } })) as HexString;

    await this.sdk.apiClient.metaTransaction.SubmitTransaction({ id, signature });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.metaTransaction.GetStatus(id),
      (res) => {
        return res === "completed";
      },
      120,
      10000,
    );

    return {
      type: BALANCE_TYPE.SA,
      walletId: "PLACEHOLDER", // TODO Remove
      source: this.#intent.toAddress,
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

    const { id, gasFeeInCurrency } = await this.sdk.apiClient.metaTransaction.EstimateGas({
      type: META_TRANSACTION_TYPES.ERC1155_WITHDRAW,
      currencyAddress,
      amount: this.input.balance.toString(),
      fromAddress: this.input.source,
      network: this.input.networkSlug,
      toAddress: this.#intent.toAddress,
    });

    return {
      gas: BigInt(gasFeeInCurrency ?? "0"),
      curvyFee: 0n,
      id,
    };
  }
}

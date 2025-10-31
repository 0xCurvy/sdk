import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractAggregatorCommand } from "@/planner/commands/aggregator/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type Erc1155BalanceEntry,
  type GetStealthAddressReturnType,
  type HexString,
  type InputNote,
  Note,
  type WithdrawRequest,
} from "@/types";
import { generateWithdrawalHash } from "@/utils/aggregator";

interface AggregatorWithdrawToErc1155CommandEstimate extends CurvyCommandEstimate {
  data: Erc1155BalanceEntry;
  stealthAddressData: GetStealthAddressReturnType;
}

export class AggregatorWithdrawToErc1155Command extends AbstractAggregatorCommand {
  protected declare estimateData: AggregatorWithdrawToErc1155CommandEstimate | undefined;

  #createWithdrawRequest(inputNotes: InputNote[], destinationAddress: HexString): WithdrawRequest {
    if (!this.network.withdrawCircuitConfig) {
      throw new Error("Network withdraw circuit config is not defined!");
    }

    if (!inputNotes || !destinationAddress) {
      throw new Error("Invalid withdraw payload parameters");
    }

    const inputNotesLength = inputNotes.length;

    for (let i = inputNotesLength; i < this.network.withdrawCircuitConfig.maxInputs; i++) {
      inputNotes.push(
        new Note({
          owner: {
            babyJubjubPublicKey: inputNotes[0].owner.babyJubjubPublicKey,
            sharedSecret: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`,
          },
          balance: {
            amount: "0",
            token: inputNotes[0].balance.token.toString(),
          },
        }).serializeInputNote(),
      );
    }

    const messageHash = generateWithdrawalHash(inputNotes, destinationAddress);
    const rawSignature = this.sdk.walletManager.signMessageWithBabyJubjub(messageHash);
    const signature = {
      S: BigInt(rawSignature.S),
      R8: rawSignature.R8.map((r) => BigInt(r)),
    };

    return {
      inputNotes,
      signature,
      destinationAddress,
    };
  }

  async execute(): Promise<CurvyCommandData> {
    const { networkSlug, environment, symbol, lastUpdated, currencyAddress, walletId } = this.input[0];

    if (!this.estimateData) {
      throw new Error("[AggregatorWithdrawToERC1155Command] Command must be estimated before execution!");
    }

    const { stealthAddressData } = this.estimateData;

    const { address: erc1155Address, announcementData } =
      await this.sdk.registerStealthAddressForUser(stealthAddressData);

    await this.sdk.storage.storeCurvyAddress({
      ...announcementData,
      address: erc1155Address,
      walletId,
      lastScannedAt: { mainnet: 0, testnet: 0 },
    });

    // TODO: Fix this so that we dont have same return values as args
    const withdrawRequest = this.#createWithdrawRequest(
      this.inputNotes.map((note) => note.serializeInputNote()),
      erc1155Address,
    );

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitWithdraw(withdrawRequest);

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "success";
      },
    );

    await this.sdk.storage.removeSpentBalanceEntries("note", this.input);

    const { balances } = await this.sdk.rpcClient.Network(this.input[0].networkSlug).getErc1155Balances(erc1155Address);
    const erc1155Balance = balances.find((b) => b.currencyAddress === this.input[0].currencyAddress);

    if (!erc1155Balance) {
      throw new Error("Failed to retrieve ERC1155 balance after deposit!");
    }

    // TODO: Create utility methods for creating balance entries in commands
    return {
      type: BALANCE_TYPE.ERC1155,
      walletId: this.input[0].walletId,
      source: erc1155Address,
      erc1155TokenId: erc1155Balance.erc1155TokenId,
      networkSlug,
      environment,
      balance: erc1155Balance.balance,
      symbol,
      decimals: this.input[0].decimals,
      currencyAddress,
      lastUpdated,
    } satisfies Erc1155BalanceEntry;
  }

  // In the case of aggregator-withdraw-to-csuc command, both the circuit
  // and the aggregator SC have withdrawBPS set, circuits calculate what is the
  // feeAmount and pass it to CSUC so that CSUC can put it on th fee collector
  async estimate(): Promise<AggregatorWithdrawToErc1155CommandEstimate> {
    const { networkSlug, environment, symbol, lastUpdated, currencyAddress, erc1155TokenId, decimals, walletId } =
      this.input[0];

    const curvyFee = this.inputNotesSum / 500n; // 0.2% = 1/500

    const stealthAddressData = await this.sdk.generateNewStealthAddressForUser(networkSlug, this.senderCurvyHandle);

    return {
      curvyFee,
      gas: 0n,
      stealthAddressData,
      data: {
        type: BALANCE_TYPE.ERC1155,
        walletId,
        source: stealthAddressData.address,
        erc1155TokenId: erc1155TokenId,
        networkSlug,
        environment,
        balance: this.inputNotesSum - curvyFee,
        symbol,
        decimals,
        currencyAddress,
        lastUpdated,
      },
    };
  }
}

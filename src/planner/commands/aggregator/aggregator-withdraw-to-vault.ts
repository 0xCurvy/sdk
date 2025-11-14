import { AbstractAggregatorCommand } from "@/planner/commands/aggregator/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type HexString,
  type InputNote,
  Note,
  type VaultBalanceEntry,
  type WithdrawRequest,
} from "@/types";
import { generateWithdrawalHash } from "@/utils/aggregator";
import { toSlug } from "@/utils/helpers";

export class AggregatorWithdrawToVaultCommand extends AbstractAggregatorCommand {
  get name(): string {
    return "AggregatorWithdrawToVaultCommand";
  }

  async calculateCurvyFeeInCurrency() {
    return (this.inputNotesSum * BigInt(this.network.withdrawCircuitConfig!.groupFee)) / 1000n;
  }

  async calculateGasFeeInCurrency() {
    return 0n;
  }

  async getDesiredAmount() {
    return this.inputNotesSum;
  }

  async #createWithdrawRequest(inputNotes: InputNote[], destinationAddress: HexString): Promise<WithdrawRequest> {
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
    const rawSignature = await this.sdk.walletManager.signMessageWithBabyJubjub(messageHash);
    const signature = {
      S: BigInt(rawSignature.S),
      R8: rawSignature.R8.map((r) => BigInt(r)),
    };

    return {
      inputNotes,
      signature,
      destinationAddress,
      networkId: this.network.id,
    };
  }

  async run(): Promise<CurvyCommandData> {
    const { address, announcementData } = await this.sdk.generateAndRegisterNewStealthAddressForUser(
      toSlug(this.network.name),
      this.senderCurvyHandle,
    );

    await this.sdk.storage.storeCurvyAddress({
      ...announcementData,
      address: address,
      walletId: this.input[0].walletId,
      lastScannedAt: { mainnet: 0, testnet: 0 },
    });

    const withdrawRequest = await this.#createWithdrawRequest(
      this.inputNotes.map((note) => note.serializeInputNote()),
      address,
    );

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitWithdraw(withdrawRequest);

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "success";
      },
    );

    const { networkSlug, environment, symbol, lastUpdated, currencyAddress, vaultTokenId, decimals, walletId } =
      this.input[0];

    return {
      type: BALANCE_TYPE.VAULT,
      walletId,
      source: address,
      vaultTokenId: vaultTokenId,
      networkSlug,
      environment,
      balance: this.estimateData!.netAmount,
      symbol,
      decimals,
      currencyAddress,
      lastUpdated,
    } satisfies VaultBalanceEntry;
  }
}

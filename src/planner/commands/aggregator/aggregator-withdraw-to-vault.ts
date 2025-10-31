import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractAggregatorCommand } from "@/planner/commands/aggregator/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type GetStealthAddressReturnType,
  type HexString,
  type InputNote,
  Note,
  type VaultBalanceEntry,
  type WithdrawRequest,
} from "@/types";
import { generateWithdrawalHash } from "@/utils/aggregator";

interface AggregatorWithdrawToVaultCommandEstimate extends CurvyCommandEstimate {
  data: VaultBalanceEntry;
  stealthAddressData: GetStealthAddressReturnType;
}

export class AggregatorWithdrawToVaultCommand extends AbstractAggregatorCommand {
  protected declare estimateData: AggregatorWithdrawToVaultCommandEstimate | undefined;

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
      throw new Error("[AggregatorWithdrawToVaultCommand] Command must be estimated before execution!");
    }

    const { stealthAddressData } = this.estimateData;

    const { address: vaultAddress, announcementData } =
      await this.sdk.registerStealthAddressForUser(stealthAddressData);

    await this.sdk.storage.storeCurvyAddress({
      ...announcementData,
      address: vaultAddress,
      walletId,
      lastScannedAt: { mainnet: 0, testnet: 0 },
    });

    // TODO: Fix this so that we dont have same return values as args
    const withdrawRequest = this.#createWithdrawRequest(
      this.inputNotes.map((note) => note.serializeInputNote()),
      vaultAddress,
    );

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitWithdraw(withdrawRequest);

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "success";
      },
    );

    await this.sdk.storage.removeSpentBalanceEntries(this.input);

    const { balances } = await this.sdk.rpcClient.Network(this.input[0].networkSlug).getVaultBalances(vaultAddress);
    const vaultBalance = balances.find((b) => b.currencyAddress === this.input[0].currencyAddress);

    if (!vaultBalance) {
      throw new Error("Failed to retrieve Vault balance after deposit!");
    }

    // TODO: Create utility methods for creating balance entries in commands
    return {
      type: BALANCE_TYPE.VAULT,
      walletId: this.input[0].walletId,
      source: vaultAddress,
      vaultTokenId: vaultBalance.vaultTokenId,
      networkSlug,
      environment,
      balance: vaultBalance.balance,
      symbol,
      decimals: this.input[0].decimals,
      currencyAddress,
      lastUpdated,
    } satisfies VaultBalanceEntry;
  }

  // In the case of aggregator-withdraw-to-csuc command, both the circuit
  // and the aggregator SC have withdrawBPS set, circuits calculate what is the
  // feeAmount and pass it to CSUC so that CSUC can put it on th fee collector
  async estimate(): Promise<AggregatorWithdrawToVaultCommandEstimate> {
    const { networkSlug, environment, symbol, lastUpdated, currencyAddress, vaultTokenId, decimals, walletId } =
      this.input[0];

    const curvyFee = this.inputNotesSum / 500n; // 0.2% = 1/500

    const stealthAddressData = await this.sdk.generateNewStealthAddressForUser(networkSlug, this.senderCurvyHandle);

    return {
      curvyFee,
      gas: 0n,
      stealthAddressData,
      data: {
        type: BALANCE_TYPE.VAULT,
        walletId,
        source: stealthAddressData.address,
        vaultTokenId: vaultTokenId,
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

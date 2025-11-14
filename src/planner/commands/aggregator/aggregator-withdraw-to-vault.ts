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

  get name(): string {
    return "AggregatorWithdrawToVaultCommand";
  }

  calculateCurvyFee(): bigint {
    if (!this.network.withdrawCircuitConfig) {
      throw new Error(`Network aggregation circuit config is not defined for network ${this.network.name}!`);
    }
    return (this.inputNotesSum * BigInt(this.network.withdrawCircuitConfig.groupFee)) / 1000n;
  }

  async getResultingBalanceEntry(
    address: HexString,
    estimationParams?: { curvyFeeInCurrency: bigint },
  ): Promise<VaultBalanceEntry> {
    const { networkSlug, environment, symbol, lastUpdated, currencyAddress, vaultTokenId, decimals, walletId } =
      this.input[0];

    const _curvyFeeInCurrency = estimationParams?.curvyFeeInCurrency ?? this.estimateData?.curvyFeeInCurrency;
    let _balance: bigint;

    if (estimationParams) {
      _balance = this.inputNotesSum - (_curvyFeeInCurrency ?? 0n);
    } else {
      const { balances } = await this.rpc.getVaultBalances(address);

      const vaultBalance = balances.find((b) => b.currencyAddress === currencyAddress);
      if (!vaultBalance) {
        throw new Error("Failed to retrieve Vault balance after deposit!");
      }

      _balance = vaultBalance.balance;
    }

    return {
      type: BALANCE_TYPE.VAULT,
      walletId,
      source: address,
      vaultTokenId: vaultTokenId,
      networkSlug,
      environment,
      balance: _balance,
      symbol,
      decimals,
      currencyAddress,
      lastUpdated,
    } satisfies VaultBalanceEntry;
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

  async execute(): Promise<CurvyCommandData> {
    if (!this.estimateData) {
      throw new Error("[AggregatorWithdrawToVaultCommand] Command must be estimated before execution!");
    }

    const { stealthAddressData } = this.estimateData;

    const { address: vaultAddress, announcementData } =
      await this.sdk.registerStealthAddressForUser(stealthAddressData);

    await this.sdk.storage.storeCurvyAddress({
      ...announcementData,
      address: vaultAddress,
      walletId: this.input[0].walletId,
      lastScannedAt: { mainnet: 0, testnet: 0 },
    });

    // TODO: Fix this so that we dont have same return values as args
    const withdrawRequest = await this.#createWithdrawRequest(
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

    return this.getResultingBalanceEntry(vaultAddress);
  }

  async estimate(): Promise<AggregatorWithdrawToVaultCommandEstimate> {
    const curvyFeeInCurrency = this.calculateCurvyFee();

    const stealthAddressData = await this.sdk.generateNewStealthAddressForUser(
      this.input[0].networkSlug,
      this.senderCurvyHandle,
    );

    return {
      curvyFeeInCurrency,
      gasFeeInCurrency: 0n,
      stealthAddressData,
      data: await this.getResultingBalanceEntry(stealthAddressData.address, { curvyFeeInCurrency }),
    };
  }
}

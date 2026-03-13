import { getQuote } from "@lifi/sdk";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractAggregatorCommand } from "@/planner/commands/aggregator/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/type";
import {
  BALANCE_TYPE,
  type HexString,
  type InputNote,
  isHexString,
  Note,
  type SaBalanceEntry,
  type WithdrawRequest,
} from "@/types";
import { generateWithdrawalHash } from "@/utils/aggregator";
import { pollForCriteria } from "@/utils/helpers";

export class AggregatorWithdrawCommand extends AbstractAggregatorCommand {
  readonly #intent: CurvyIntent;

  constructor(
    id: string,
    sdk: ICurvySDK,
    input: CurvyCommandData,
    intent: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ) {
    super(id, sdk, input, estimate);
    this.#intent = intent;
  }

  get name(): string {
    return "AggregatorWithdrawToVaultCommand";
  }

  get grossAmount(): bigint {
    return this.inputNotesSum;
  }

  override get recipient() {
    if (!isHexString(this.#intent.recipient)) {
      throw new Error("Withdraw command recipient must be a hex string address");
    }

    return this.#intent.recipient;
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
      R8: rawSignature.R8.map((r: any) => BigInt(r)),
    };

    return {
      inputNotes,
      signature,
      destinationAddress,
      networkId: this.network.id,
    };
  }

  async estimateFees() {
    this.estimate = {
      curvyFeeInCurrency: (this.inputNotesSum * BigInt(this.network.withdrawCircuitConfig!.groupFee)) / 1000n,
      gasFeeInCurrency: 0n,
    };

    if (this.#intent.type === "external-transfer" && this.#intent.exitNetwork) {
      const exitNetworkCurrencyAddress = this.#intent.exitNetwork.currencies.find(
        (c) => c.id === this.#intent.currency?.id,
      )?.contractAddress;

      if (!exitNetworkCurrencyAddress) {
        throw new Error("Couldn't find exit currency on the specified exit network");
      }

      const quote = await getQuote({
        fromAddress: this.recipient,
        fromChain: this.#intent.network.chainId,
        toChain: this.#intent.exitNetwork.chainId,
        fromToken: this.#intent.currency.contractAddress,
        toToken: exitNetworkCurrencyAddress,
        fromAmount: this.netAmount.toString(),
      });

      this.estimate.bridgeFeeInCurrency =
        quote.estimate.feeCosts?.reduce((acc, curr) => acc + BigInt(curr.amount), 0n) ?? 0n;
    }

    if (this.#intent.type === "curvy-swap") {
      const quote = await getQuote({
        fromAddress: this.recipient,
        fromChain: this.network.chainId,
        toChain: this.network.chainId,
        fromToken: this.#intent.currency.contractAddress,
        toToken: this.#intent.exitCurrency.contractAddress,
        fromAmount: this.netAmount.toString(),
      });

      this.estimate.bridgeFeeInCurrency =
        quote.estimate.feeCosts?.reduce((acc, curr) => acc + BigInt(curr.amount), 0n) ?? 0n;

      this.estimate.bridgeEstimateAmount = quote.estimate.toAmount;
    }

    return this.estimate;
  }

  async getResultingBalanceEntry() {
    let { networkSlug, environment, symbol, lastUpdated, currencyAddress, vaultTokenId, decimals, walletId } =
      this.input[0];

    let balance = this.netAmount;

    if (this.#intent.type === "curvy-swap") {
      symbol = this.#intent.exitCurrency.symbol;
      currencyAddress = this.#intent.exitCurrency.contractAddress;
      decimals = this.#intent.exitCurrency.decimals;
      balance = BigInt(this.estimate!.bridgeEstimateAmount!);
    }

    return {
      type: BALANCE_TYPE.SA,
      walletId,
      source: this.recipient,
      vaultTokenId: vaultTokenId,
      networkSlug,
      environment,
      balance,
      symbol,
      decimals,
      currencyAddress,
      createdAt: Date.now().toString(),
      lastUpdated,
    } satisfies SaBalanceEntry;
  }

  async execute(): Promise<CurvyCommandData> {
    const withdrawRequest = await this.#createWithdrawRequest(
      this.inputNotes.map((note) => note.serializeInputNote()),
      this.recipient,
    );

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitWithdraw(withdrawRequest);

    await pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "success";
      },
    );

    return this.getResultingBalanceEntry();
  }
}

import {
  type AggregationRequest,
  type CurvyCommandData,
  type CurvyIntent,
  generateAggregationHash,
  type HexString,
  type InputNote,
  isValidCurvyId,
  noteToBalanceEntry,
  type OutputNote,
} from "@/exports";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractAggregatorCommand } from "@/planner/commands/aggregator/abstract";
import { Note } from "@/types/note";
import { pollForCriteria } from "@/utils/helpers";

interface CurvyCommandEstimateWithNote extends CurvyCommandEstimate {
  note: Note;
}

export class AggregatorAggregateCommand extends AbstractAggregatorCommand {
  declare estimate: CurvyCommandEstimateWithNote;

  // If intent is not provided, it means that we are aggregating funds from multiple notes
  // to meet the requirements of main aggregation
  readonly #intent: CurvyIntent | undefined;

  constructor(
    id: string,
    sdk: ICurvySDK,
    input: CurvyCommandData,
    intent?: CurvyIntent,
    estimate?: CurvyCommandEstimate,
  ) {
    super(id, sdk, input, estimate);
    this.#intent = intent;
  }

  get name(): string {
    return "AggregatorAggregateCommand";
  }

  get grossAmount() {
    return this.inputNotesSum;
  }

  override get recipient() {
    // If there are multiple aggregation steps intent is not provided and funds are aggregated to self
    // Otherwise in last aggregation step we use the recipient data from intent
    if (this.#intent) {
      if (isValidCurvyId(this.#intent.recipient)) {
        return this.#intent.recipient;
      } else if (this.#intent.recipientPublicKeys) {
        return this.#intent.recipientPublicKeys;
      }
    }

    // During STA claim senderCurvyId is null as we use ephemeral wallet for STA claims
    // In that case we return early through intent branch
    if (!this.senderCurvyId) {
      throw new Error("Active wallet must have a Curvy Handle to perform aggregator aggregate.");
    }
    return this.senderCurvyId;
  }

  async #createAggregationRequest(inputNotes: InputNote[], outputNotes: OutputNote[]): Promise<AggregationRequest> {
    if (!this.network.aggregationCircuitConfig) {
      throw new Error("Network aggregation circuit config is not defined!");
    }

    if (outputNotes.length < this.network.aggregationCircuitConfig.maxOutputs) {
      outputNotes.push(
        Note.random({ balance: { token: outputNotes[0].balance.token, amount: "0" } }).serializeOutputNote(),
      );
    }

    const msgHash = generateAggregationHash(outputNotes);
    const rawSignature = await this.sdk.walletManager.signMessageWithBabyJubjub(msgHash);
    const signature = {
      S: BigInt(rawSignature.S),
      R8: rawSignature.R8.map((r) => BigInt(r)),
    };

    return {
      inputNotes,
      outputNotes,
      signature,
      networkId: this.network.id,
    };
  }

  async estimateFees() {
    if (this.estimate) return this.estimate;

    const curvyFeeInCurrency = (this.grossAmount * BigInt(this.network.aggregationCircuitConfig!.groupFee)) / 1000n;
    const gasFeeInCurrency = 0n;

    this.estimate = {
      curvyFeeInCurrency,
      gasFeeInCurrency,
    } as never;

    // TODO Think if this is the right way to handle change (taking it from the change amount if possible)
    // const netAmount = this.#intent && this.#intent.amount < this.netAmount ? this.#intent.amount : this.netAmount;

    const netAmount =
      this.#intent && this.#intent.amount < this.netAmount
        ? this.#intent.amount - curvyFeeInCurrency - gasFeeInCurrency
        : this.netAmount;

    this.estimate.note = await this.generateNewNote(this.recipient, this.input[0].vaultTokenId, netAmount);

    return this.estimate;
  }

  async getResultingBalanceEntry(): Promise<CurvyCommandData> {
    const { symbol, walletId, environment, networkSlug, decimals, currencyAddress } = this.input[0];

    return noteToBalanceEntry(this.estimate.note, {
      symbol,
      decimals,
      walletId,
      environment,
      networkSlug,
      currencyAddress: currencyAddress as HexString,
    });
  }

  async execute(): Promise<CurvyCommandData | undefined> {
    const token = this.input[0].vaultTokenId;

    let changeOrDummyOutputNote: Note;

    // TODO Think if this is the right way to handle change (taking it from the change amount if possible)
    // const changeAmount =
    //   this.#intent && this.#intent.amount < this.netAmount ? this.netAmount - this.#intent.amount : 0n;

    const changeAmount = this.netAmount - this.estimate.note.balance!.amount;
    if (changeAmount) {
      changeOrDummyOutputNote = await this.generateNewNote(
        this.senderCurvyId!, // Estimate will fail earlier if senderCurvyId is null, if called somehow generateNewNote will throw
        token,
        changeAmount,
      );
    } else {
      // If there is no change, then we create a dummy note
      changeOrDummyOutputNote = Note.random({
        balance: {
          amount: "0",
          token: token.toString(),
        },
      });
    }

    const inputNotes = this.inputNotes.map((note) => note.serializeInputNote());
    const outputNotes = [this.estimate.note, changeOrDummyOutputNote].map((note) => note.serializeOutputNote());

    const aggregationRequest = await this.#createAggregationRequest(inputNotes, outputNotes);

    const requestId = await this.sdk.apiClient.aggregator.SubmitAggregation(aggregationRequest);

    await pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId.requestId),
      (res) => {
        return res.status === "success";
      },
    );

    return this.getResultingBalanceEntry();
  }
}

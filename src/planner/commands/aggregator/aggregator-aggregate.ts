import {
  type AggregationRequest,
  generateAggregationHash,
  type HexString,
  type InputNote,
  isValidCurvyHandle,
  noteToBalanceEntry,
  type OutputNote,
} from "@/exports";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AbstractAggregatorCommand } from "@/planner/commands/aggregator/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { Note } from "@/types/note";

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
    if (this.#intent && this.#intent.amount < this.inputNotesSum) {
      return this.#intent.amount;
    }

    return this.inputNotesSum;
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
    // If we are sending to a curvy name then set the toAddress to that address, otherwise send to us - and we will later withdraw to EOA.
    let toAddress = this.senderCurvyHandle;
    if (this.#intent && isValidCurvyHandle(this.#intent.toAddress)) {
      toAddress = this.#intent.toAddress;
    }

    const curvyFeeInCurrency = (this.inputNotesSum * BigInt(this.network.aggregationCircuitConfig!.groupFee)) / 1000n;
    const gasFeeInCurrency = 0n;

    this.estimate.curvyFeeInCurrency = curvyFeeInCurrency;
    this.estimate.gasFeeInCurrency = gasFeeInCurrency;
    this.estimate.note = await this.sdk.getNewNoteForUser(toAddress, this.input[0].vaultTokenId, this.netAmount);

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

    // If we have the intent passed, and it's amount is less than the sum of input notes
    // then we calculate the change for passing it as the second output note, instead of the dummy one
    if (this.#intent && this.#intent.amount < this.inputNotesSum) {
      // This means we should address the note to another recipient right now

      // Change note
      changeOrDummyOutputNote = await this.sdk.getNewNoteForUser(
        this.senderCurvyHandle,
        token,
        this.inputNotesSum - this.#intent.amount,
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

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId.requestId),
      (res) => {
        return res.status === "success";
      },
    );

    return this.getResultingBalanceEntry();
  }
}

import { type AggregationRequestParams, type AggregatorRequestStatusValuesType, isValidCurvyHandle } from "@/exports";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AggregatorCommand } from "@/planner/commands/aggregator/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { Note } from "@/types/note";

export class AggregatorAggregateCommand extends AggregatorCommand {
  readonly #intent: CurvyIntent | undefined;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent?: CurvyIntent) {
    super(sdk, input);
    this.#intent = intent;
  }

  // TODO: Check how will token symbol and those things be affected with multi asset notes?
  async execute(): Promise<CurvyCommandData | undefined> {
    const token = this.inputNotes[0].balance!.token;
    let toAddress = this.senderCurvyHandle;

    let changeOrDummyOutputNote: Note;

    // If we have the intent passed, and it's amount is less than the sum of input notes
    // then we calculate the change for passing it as the second output note, instead of the dummy one
    if (this.#intent && this.#intent.amount < this.inputNotesSum) {
      // This means we should address the note to another recipient right now
      if (isValidCurvyHandle(this.#intent.toAddress)) {
        toAddress = this.#intent.toAddress;
      }

      // Change note
      const change = this.inputNotesSum - this.#intent.amount;
      changeOrDummyOutputNote = await this.sdk.getNewNoteForUser(toAddress, token, change);
    } else {
      // If there is no change, then we create a dummy note
      changeOrDummyOutputNote = new Note({
        owner: {
          babyJubjubPublicKey: {
            x: "0",
            y: "0",
          },
          sharedSecret: "0",
        },
        ownerHash: "0",
        balance: {
          amount: "0",
          token: "0",
        },
        deliveryTag: {
          ephemeralKey: "0",
          viewTag: "0",
        },
      });
    }

    // Now we create the 2nd outut note that we will output as a result of this command
    // that will either aggregate the funds to our Curvy handle
    // or the Curvy handle of the intent's toAddress recipient
    const { curvyFee } = await this.estimate();
    const mainOutputNote = await this.sdk.getNewNoteForUser(toAddress, token, this.inputNotesSum - curvyFee);

    const prepareInputs: AggregationRequestParams = {
      inputNotes: this.inputNotes.map((note) => note.serializeAggregationInputNote()),
      outputNotes: [mainOutputNote, changeOrDummyOutputNote].map((note) => note.serializeAggregationOutputNote()),
    };

    const payload = this.sdk.createAggregationPayload(prepareInputs);

    const requestId = await this.sdk.apiClient.aggregator.SubmitAggregation(payload);

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId.requestId),
      (res: { status: AggregatorRequestStatusValuesType }) => {
        if (res.status === "failed") {
          throw new Error(`Aggregator withdraw ${res.status}`);
        }
        return res.status === "completed";
      },
      120,
      10_000,
    );

    // If we are aggregating the funds to our own address, that's the only case
    // when we want to return the output note to the rest of the plan
    if (toAddress === this.senderCurvyHandle) {
      const { symbol, walletId, environment, networkSlug, decimals } = this.input[0];

      return mainOutputNote.serializeNoteToBalanceEntry(symbol, decimals, walletId, environment, networkSlug);
    }
  }

  async estimate(): Promise<CurvyCommandEstimate> {
    return {
      curvyFee: this.inputNotesSum / 1000n, // 0.1% = 1/1000
      gas: 0n,
    };
  }
}

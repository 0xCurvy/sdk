import {
  type AggregationRequestParams,
  bigIntToDecimalString,
  type CurvyHandle,
  type HexString,
  isValidCurvyHandle,
  type NoteBalanceEntry,
} from "@/exports";
import type { ICurvySDK } from "@/interfaces/sdk";
import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AggregatorCommand } from "@/planner/commands/aggregator/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { Note } from "@/types/note";

interface AggregatorAggregateCommandEstimate extends CurvyCommandEstimate {
  mainOutputNote: Note;
  changeOrDummyOutputNote: Note;
  toAddress: CurvyHandle | HexString;
}

export class AggregatorAggregateCommand extends AggregatorCommand {
  readonly #intent: CurvyIntent;
  protected declare estimateData: AggregatorAggregateCommandEstimate | undefined;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, intent: CurvyIntent, estimate?: CurvyCommandEstimate) {
    super(sdk, input, estimate);
    this.#intent = intent;
  }

  // TODO: Check how will token symbol and those things be affected with multi asset notes?
  async execute(): Promise<CurvyCommandData | undefined> {
    if (!this.estimateData) {
      throw new Error("[AggregatorAggregateCommand] Command must be estimated before execution!");
    }

    const { mainOutputNote, changeOrDummyOutputNote, toAddress } = this.estimateData;

    const prepareInputs: AggregationRequestParams = {
      inputNotes: this.inputNotes.map((note) => note.serializeAggregationInputNote()),
      outputNotes: [mainOutputNote, changeOrDummyOutputNote].map((note) => note.serializeAggregationOutputNote()),
    };

    const payload = this.sdk.createAggregationPayload(prepareInputs, this.network);

    const requestId = await this.sdk.apiClient.aggregator.SubmitAggregation(payload);

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId.requestId),
      (res) => {
        if (res.status === "failed") {
          throw new Error(`[AggregatorAggregateCommand]Aggregator aggregate failed!`);
        }
        return res.status === "success";
      },
    );

    await this.sdk.storage.updateBalancesAndTotals(
      this.input[0].walletId,
      this.input.map((i) => ({ ...i, balance: 0n })),
    );

    // If we are aggregating the funds to our own address, that's the only case
    // when we want to return the output note to the rest of the plan
    if (toAddress === this.senderCurvyHandle) {
      const { symbol, walletId, environment, networkSlug, decimals, currencyAddress } = this.input[0];

      return mainOutputNote.toBalanceEntry(
        symbol,
        decimals,
        walletId,
        environment,
        networkSlug,
        currencyAddress as HexString,
      );
    }
  }

  async estimate(): Promise<AggregatorAggregateCommandEstimate> {
    const token = this.input[0].erc1155TokenId;

    if (!token) {
      throw new Error("[AggregatorAggregateCommand]: Could not find erc1155TokenId of the input note!");
    }

    let toAddress = this.senderCurvyHandle;

    let changeOrDummyOutputNote: Note;

    // If we have the intent passed, and it's amount is less than the sum of input notes
    // then we calculate the change for passing it as the second output note, instead of the dummy one
    if (this.#intent.amount < this.inputNotesSum) {
      // This means we should address the note to another recipient right now

      // Change note
      const change = this.inputNotesSum - this.#intent.amount;
      changeOrDummyOutputNote = await this.sdk.getNewNoteForUser(toAddress, token, change);

      // We update the toAddress only after the change note is created, so that we don't get both notes
      if (isValidCurvyHandle(this.#intent.toAddress)) {
        toAddress = this.#intent.toAddress;
      }
    } else {
      // If there is no change, then we create a dummy note
      changeOrDummyOutputNote = new Note({
        owner: {
          babyJubjubPublicKey: {
            x: "0",
            y: "0",
          },
          sharedSecret: BigInt(
            `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`,
          ).toString(),
        },
        ownerHash: "0",
        balance: {
          amount: "0",
          token: token.toString(),
        },
        deliveryTag: {
          ephemeralKey: bigIntToDecimalString(
            BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`),
          ),
          viewTag: "0",
        },
      });
    }

    const curvyFee = this.inputNotesSum / 1000n; // 0.1% = 1/1000

    const mainOutputNote = await this.sdk.getNewNoteForUser(toAddress, token, this.#intent.amount - curvyFee);

    let data: NoteBalanceEntry | undefined;

    if (toAddress === this.senderCurvyHandle) {
      const { symbol, walletId, environment, networkSlug, decimals, currencyAddress } = this.input[0];

      data = mainOutputNote.toBalanceEntry(
        symbol,
        decimals,
        walletId,
        environment,
        networkSlug,
        currencyAddress as HexString,
      );
    }

    return {
      curvyFee,
      gas: 0n,
      mainOutputNote,
      toAddress,
      changeOrDummyOutputNote,
      data,
    };
  }
}

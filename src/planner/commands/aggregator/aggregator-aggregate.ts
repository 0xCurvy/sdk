import {
  type AggregationRequest,
  bigIntToDecimalString,
  type CurvyHandle,
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

interface AggregatorAggregateCommandEstimate extends CurvyCommandEstimate {
  mainOutputNote: Note;
  changeOrDummyOutputNote: Note;
  toAddress: CurvyHandle | HexString;
}

export class AggregatorAggregateCommand extends AbstractAggregatorCommand {
  // If intent is not provided, it means that we are aggregating funds from multiple notes
  // to meet the requirements of main aggregation
  readonly #intent: CurvyIntent | undefined;
  protected declare estimateData: AggregatorAggregateCommandEstimate | undefined;

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

  #createAggregationRequest(inputNotes: InputNote[], outputNotes: OutputNote[]): AggregationRequest {
    if (!this.network.aggregationCircuitConfig) {
      throw new Error("Network aggregation circuit config is not defined!");
    }

    if (outputNotes.length < this.network.aggregationCircuitConfig.maxOutputs) {
      outputNotes.push(
        new Note({
          owner: {
            babyJubjubPublicKey: {
              x: "0",
              y: "0",
            },
            sharedSecret: BigInt(
              `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`,
            ).toString(),
          },
          balance: {
            amount: "0",
            token: outputNotes[0].balance.token,
          },
          deliveryTag: {
            ephemeralKey: bigIntToDecimalString(
              BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`),
            ),
            viewTag: "0x0",
          },
        }).serializeOutputNote(),
      );
    }

    const msgHash = generateAggregationHash(outputNotes);
    const rawSignature = this.sdk.walletManager.signMessageWithBabyJubjub(msgHash);
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

  async execute(): Promise<CurvyCommandData | undefined> {
    if (!this.estimateData) {
      throw new Error("[AggregatorAggregateCommand] Command must be estimated before execution!");
    }

    const { mainOutputNote, changeOrDummyOutputNote, toAddress } = this.estimateData;

    const inputNotes = this.inputNotes.map((note) => note.serializeInputNote());
    const outputNotes = [mainOutputNote, changeOrDummyOutputNote].map((note) => note.serializeOutputNote());

    const aggregationRequest = this.#createAggregationRequest(inputNotes, outputNotes);

    const requestId = await this.sdk.apiClient.aggregator.SubmitAggregation(aggregationRequest);

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId.requestId),
      (res) => {
        return res.status === "success";
      },
    );

    await this.sdk.storage.removeSpentBalanceEntries("note", this.input);

    // If we are aggregating the funds to our own address, that's the only case
    // when we want to return the output note to the rest of the plan
    if (toAddress === this.senderCurvyHandle) {
      const { symbol, walletId, environment, networkSlug, decimals, currencyAddress } = this.input[0];

      return noteToBalanceEntry(mainOutputNote, {
        symbol,
        decimals,
        walletId,
        environment,
        networkSlug,
        currencyAddress: currencyAddress as HexString,
      });
    }
  }

  async estimate(): Promise<AggregatorAggregateCommandEstimate> {
    const token = this.input[0].vaultTokenId;

    if (!token) {
      throw new Error("[AggregatorAggregateCommand]: Could not find vaultTokenId of the input note!");
    }

    let toAddress = this.senderCurvyHandle;

    let changeOrDummyOutputNote: Note;

    // If we have the intent passed, and it's amount is less than the sum of input notes
    // then we calculate the change for passing it as the second output note, instead of the dummy one
    if (this.#intent && this.#intent.amount < this.inputNotesSum) {
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
        balance: {
          amount: "0",
          token: token.toString(),
        },
        deliveryTag: {
          ephemeralKey: bigIntToDecimalString(
            BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`),
          ),
          viewTag: "0x0",
        },
      });
    }

    // Now we create the 2nd output note that we will output as a result of this command
    // that will either aggregate the funds to our Curvy handle
    // or the Curvy handle of the intent's toAddress recipient

    if (!this.network.aggregationCircuitConfig) {
      throw new Error(`Network aggregation circuit config is not defined for network ${this.network.name}!`);
    }

    const curvyFee = (this.inputNotesSum * BigInt(this.network.aggregationCircuitConfig.groupFee)) / 1000n;

    const effectiveAmount = this.inputNotesSum - changeOrDummyOutputNote.balance!.amount - curvyFee;
    const mainOutputNote = await this.sdk.getNewNoteForUser(toAddress, token, effectiveAmount);

    const { symbol, walletId, environment, networkSlug, decimals, currencyAddress } = this.input[0];

    const data = noteToBalanceEntry(mainOutputNote, {
      symbol,
      decimals,
      walletId,
      environment,
      networkSlug,
      currencyAddress: currencyAddress as HexString,
    });

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

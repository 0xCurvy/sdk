import type { AggregationRequestParams, AggregatorRequestStatusValuesType } from "@/exports";
import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";
import { Note } from "@/types/note";

export class AggregatorAggregateCommand extends CurvyCommand {
  sdk: ICurvySDK;
  #amount: bigint;
  #intent: CurvyIntent;

  constructor(sdk: ICurvySDK, input: CurvyCommandData, amount: bigint, intent: CurvyIntent) {
    super(input);
    this.sdk = sdk;
    this.#amount = amount;
    this.#intent = intent;
  }

  async execute(): Promise<CurvyCommandData> {
    // TODO:  Payload ti ovde nije dobar
    //   nisi dobro struktuirao ulazni argument koji je Params koji se sastoji od input i output noteova, ovo sto je this.input su samo input Noteovi
    //   outpuut notove nisi definisao a njih trebas da definises tako sto
    //   ces da proveris da li je suma input noteova veca od amounta prosledjenog u ovu komandu (pogledaj parent granu vidi da ova komanda prima i amount argument)
    //   ako je suma veca, onda ces umesto dummy nota da pravis change note kao output koji tebi vraca pare
    //   ako je suma jednaka, onda ces praviti drugi output note kao dummy note

    const addresses = Array.isArray(this.input) ? this.input : [this.input];

    const noteAddresses = addresses.filter((addr) => addr.type === "note");

    const inputNotes: Note[] = noteAddresses.map((addr) => Note.fromNoteBalanceEntry(addr));
    const outputNotes: Note[] = [];
    const balance = inputNotes.reduce((acc, note) => acc + BigInt(note.balance!.amount), 0n);

    const change = balance - this.#amount;
    const fee = balance / 1000n; // 0.1% = 1/1000
    //generateOutputNote () i vrati dole

    if (balance > this.#amount) {
      const nekiAmount = this.#intent.amount;
      const outputNote = inputNotes[0].serializeAggregationOutputNote();
      let note = new Note(outputNote);
      if (note.balance === undefined) {
        throw new Error("Invalid note");
      }
      note.balance.amount = this.#amount;
      outputNotes.push(note);

      note = new Note(outputNote);
      if (note.balance === undefined) {
        throw new Error("Invalid note");
      }
      note.balance.amount = change - fee;
      outputNotes.push(note);

      //generateOutputNote (4,6-0.1% od sume svih noteva koji ulaze u agg) i vrati mi ga dole posle
    } else if (balance === this.#amount) {
      const outputNote = inputNotes[0].serializeAggregationOutputNote();
      outputNote.amount = balance - fee;
      outputNotes.push(Note.deserializeAggregationOutputNote(outputNote));

      const dummy = new Note({
        owner: {
          babyJubjubPublicKey: {
            x: 0n,
            y: 0n,
          },
          sharedSecret: 0n,
        },
        ownerHash: 0n,
        balance: {
          amount: 0n,
          token: 0n,
        },
        deliveryTag: {
          ephemeralKey: 0n,
          viewTag: 0n,
        },
      });
      outputNotes.push(dummy);

      //generateoutputNote (10-0.1%,dummy) i vrati mi posle njega dole
    }

    const prepareInputs: AggregationRequestParams = { inputNotes: inputNotes, outputNotes: outputNotes };

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

    return Promise.resolve(
      outputNotes.map((note) =>
        note.serializeNoteToBalanceEntry(
          noteAddresses[0].symbol,
          noteAddresses[0].walletId,
          noteAddresses[0].environment,
          noteAddresses[0].networkSlug,
        ),
      ),
    );
  }

  estimate(): Promise<CurvyCommandEstimate> {
    // @ts-expect-error
    return Promise.resolve(undefined);
  }
}

import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import type { Note, NoteBalanceEntry } from "@/types";
import { balanceEntryToNote } from "@/utils";

export abstract class AbstractAggregatorCommand extends CurvyCommand {
  protected declare input: NoteBalanceEntry[];
  protected readonly inputNotes: Note[];
  protected readonly inputNotesSum: bigint;

  constructor(id: string, sdk: ICurvySDK, input: CurvyCommandData, estimate?: CurvyCommandEstimate) {
    super(id, sdk, input, estimate);

    // Because all aggregator commands take array of notes as input,
    // make sure we have an array and that it is completely comprised of notes
    const balanceEntries = Array.isArray(this.input) ? this.input.flat() : [this.input];

    const allAreNotes = balanceEntries.every((addr) => addr.type === "note");
    if (!allAreNotes) {
      throw new Error("Invalid input for command, aggregator commands only accept notes as input.");
    }

    this.input = balanceEntries;

    this.inputNotes = this.input.map((noteBalanceEntry) => balanceEntryToNote(noteBalanceEntry));
    this.inputNotesSum = this.inputNotes.reduce((acc, note) => acc + note.balance!.amount, 0n);
  }
}

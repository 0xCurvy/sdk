import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import type { Network, Note, NoteBalanceEntry } from "@/types";
import { balanceEntryToNote } from "@/utils";

export abstract class AbstractAggregatorCommand extends CurvyCommand {
  protected declare input: NoteBalanceEntry[];
  protected readonly inputNotes: Note[];
  protected readonly inputNotesSum: bigint;
  protected network: Network;

  constructor(sdk: ICurvySDK, input: CurvyCommandData) {
    super(sdk, input);

    // Because all aggregator commands take array of notes as input,
    // make sure we have an array and that it is completely comprised of notes
    const balanceEntries = Array.isArray(this.input) ? this.input.flat() : [this.input];

    const allAreNotes = balanceEntries.every((addr) => addr.type === "note");
    if (!allAreNotes) {
      throw new Error("Invalid input for command, aggregator commands only accept notes as input.");
    }

    this.network = sdk.getNetwork(balanceEntries[0].networkSlug);
    this.input = balanceEntries;

    this.inputNotes = this.input.map((noteBalanceEntry) => balanceEntryToNote(noteBalanceEntry));
    this.inputNotesSum = this.inputNotes.reduce((acc, note) => acc + note.balance!.amount, 0n);
  }
}

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

    this.validateInput(this.input);

    this.input = Array.isArray(this.input) ? this.input.flat() : [this.input];

    this.inputNotes = this.input.map((noteBalanceEntry) => balanceEntryToNote(noteBalanceEntry));
    this.inputNotesSum = this.inputNotes.reduce((acc, note) => acc + note.balance!.amount, 0n);
  }

  validateInput(input: CurvyCommandData): asserts input is NoteBalanceEntry[] {
    let firstInput: NoteBalanceEntry | undefined;
    if (Array.isArray(input)) {
      const allAreNotes = input.every((addr) => addr.type === "note");
      if (!allAreNotes) {
        throw new Error("Invalid input for command, aggregator commands only accept notes as input.");
      }
      firstInput = input[0];
    } else if (input.type === "note") {
      firstInput = input;
    } else {
      throw new Error("Invalid input for command, aggregator commands only accept notes as input.");
    }

    if (!firstInput?.vaultTokenId) {
      throw new Error(
        "Invalid input for command, aggregator commands only accept notes with currencies with vaultTokenId as input.",
      );
    }
  }
}

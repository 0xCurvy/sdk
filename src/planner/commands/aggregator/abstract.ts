import type { ICurvySDK } from "@/interfaces/sdk";
import { type CommandEstimate, CurvyCommand } from "@/planner/commands/abstract";
import type { CommandData } from "@/planner/type";
import type { Note, NoteBalanceEntry } from "@/types";
import type { DeepNonNullable } from "@/types/helper";
import { balanceEntryToNote } from "@/utils";

export abstract class AbstractAggregatorCommand extends CurvyCommand {
  protected declare input: DeepNonNullable<NoteBalanceEntry>[];
  protected readonly inputNotes: Note[];
  protected readonly inputNotesSum: bigint;

  constructor(id: string, sdk: ICurvySDK, input: CommandData, estimate?: CommandEstimate) {
    if (Array.isArray(input)) {
      const allAreNotes = input.every((addr) => addr.type === "note");
      if (!allAreNotes) {
        throw new Error("Invalid input for command, aggregator commands only accept notes as input.");
      }

      if (input.some((note) => !note.vaultTokenId)) {
        throw new Error("Invalid input for command, vaultTokenId is required.");
      }
    } else {
      if (input.type !== "note") {
        throw new Error("Invalid input for command, aggregator commands only accept notes as input.");
      }

      if (!input.vaultTokenId) {
        throw new Error("Invalid input for command, vaultTokenId is required.");
      }
    }

    super(id, sdk, input, estimate);

    this.input = Array.isArray(this.input) ? this.input.flat() : [this.input];

    this.inputNotes = this.input.map((noteBalanceEntry) => balanceEntryToNote(noteBalanceEntry));
    this.inputNotesSum = this.inputNotes.reduce((acc, note) => acc + note.balance!.amount, 0n);
  }
}

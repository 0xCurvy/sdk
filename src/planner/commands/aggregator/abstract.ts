import type { ICurvySDK } from "@/interfaces/sdk";
import { type CommandEstimate, CurvyCommand } from "@/planner/commands/abstract";
import type { CommandData } from "@/planner/type";
import type { BalanceEntry, Note } from "@/types";
import type { DeepNonNullable } from "@/types/helper";
import { balanceEntryToNote } from "@/utils";

export abstract class AbstractAggregatorCommand extends CurvyCommand {
  protected declare input: DeepNonNullable<BalanceEntry>[];
  protected readonly inputNotes: Note[];
  protected readonly inputNotesSum: bigint;

  protected constructor(id: string, sdk: ICurvySDK, input: CommandData, estimate?: CommandEstimate) {
    if (Array.isArray(input)) {
      if (input.some((note) => !note.vaultTokenId)) {
        throw new Error("Invalid input for command, vaultTokenId is required.");
      }
    } else {
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

import type { ICurvySDK } from "@/interfaces/sdk";
import { CurvyCommand } from "@/planner/commands/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import { type CurvyHandle, Note, type NoteBalanceEntry } from "@/types";

export abstract class AggregatorCommand extends CurvyCommand {
  protected declare input: NoteBalanceEntry[];
  protected readonly senderCurvyHandle: CurvyHandle;
  protected readonly inputNotes: Note[];
  protected readonly inputNotesSum: bigint;

  constructor(sdk: ICurvySDK, input: CurvyCommandData) {
    super(sdk, input);

    this.senderCurvyHandle = sdk.walletManager.activeWallet.curvyHandle;

    // Because all aggregator commands take array of notes as input,
    // make sure we have an array and that it is completely comprised of notes
    const balanceEntries = Array.isArray(this.input) ? this.input : [this.input];

    const allAreNotes = balanceEntries.every((addr) => addr.type === "note");
    if (!allAreNotes) {
      throw new Error("Invalid input for command, aggregator commands only accept notes as input.");
    }

    this.input = balanceEntries;

    this.inputNotes = this.input.map((note) => Note.fromNoteBalanceEntry(note));
    this.inputNotesSum = this.inputNotes.reduce((acc, note) => acc + BigInt(note.balance!.amount), 0n);
  }
}

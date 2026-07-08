import { balanceEntryToNote, type Note } from "@/note";
import type { CommandData } from "@/planner/types";
import type { DeepNonNullable } from "@/types/helper";
import type { BalanceEntry } from "@/types/storage";
import { invariant } from "@/utils/invariant";

/**
 * Validate + normalize a command's input to a note array and its gross total.
 * Shared by the aggregate + withdraw command factories: asserts every entry
 * carries a `vaultTokenId`, flattens the input to an array, converts each entry
 * to a {@link Note}, and sums the amounts.
 */
export function normalizeCommandNotes(rawInput: CommandData): {
  input: DeepNonNullable<BalanceEntry>[];
  inputNotes: Note[];
  grossAmount: bigint;
} {
  if (Array.isArray(rawInput)) {
    invariant(!rawInput.some((note) => !note.vaultTokenId), "Invalid input for command, vaultTokenId is required.");
  } else {
    invariant(rawInput.vaultTokenId, "Invalid input for command, vaultTokenId is required.");
  }

  const input: DeepNonNullable<BalanceEntry>[] = (
    Array.isArray(rawInput) ? rawInput.flat() : [rawInput]
  ) as DeepNonNullable<BalanceEntry>[];

  const inputNotes: Note[] = input.map((noteBalanceEntry) => balanceEntryToNote(noteBalanceEntry));
  const grossAmount = inputNotes.reduce((acc, note) => acc + note.amount, 0n);

  return { input, inputNotes, grossAmount };
}

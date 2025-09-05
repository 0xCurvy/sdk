import { Currency } from "@/types";
import { CurvyCommandAddress } from "./abstract";
import { Note } from "@/types/note";

export class CurvyCommandNoteAddress extends CurvyCommandAddress {
  #note: Note;
  // @ts-ignore
  #babyJubJubPrivateKey: string;

  constructor(note: Note, babyJubJubPrivateKey: string) {
    super();

    if (!note.balance) {
      throw new Error("Note must have a balance");
    }

    this.#note = note;

    this.#babyJubJubPrivateKey = babyJubJubPrivateKey;
  }

  get type(): string {
    return "note";
  }

  get balance(): bigint {
    return BigInt(this.#note.balance!.amount);
  }

  get currency(): Currency {
    // TODO: Rethink if we need Currency here at all.
    return this.#note.balance!.token as unknown as Currency;
  }

  get address(): string {
    return this.#note.id.toString();
  }

  sign(message: string): Promise<string> {
    // TODO: Implement
    throw new Error("Method not implemented.");
  }
}
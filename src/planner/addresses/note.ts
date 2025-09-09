import type { Currency } from "@/types";
import type { Note } from "@/types/note";
import { CurvyCommandAddress } from "./abstract";

export class CurvyCommandNoteAddress extends CurvyCommandAddress {
  #note: Note;
  // @ts-expect-error
  #babyJubJubPrivateKey: string;

  constructor(note: Note, babyJubJubPrivateKey: string) {
    super();

    if (!note.balance) {
      throw new Error("Note must have a balance");
    }

    this.#note = note;

    this.#babyJubJubPrivateKey = babyJubJubPrivateKey;
  }

  get note(): Note {
    return this.#note;
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

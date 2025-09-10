import { expect, test } from "vitest";
import { type FullNoteData, Note } from "@/types/note";

test("Should serialize and deserialize notes", async () => {
    const owner = {
        babyJubjubPublicKey: {
            x: 1n,
            y: 2n,
        },
        sharedSecret: 3n,
    }

  const ownerHash = Note.generateOwnerHash(owner);

  const noteDataFromDb: Partial<FullNoteData> = {
    ownerHash,
    balance: {
      amount: 100n,
      token: 1n,
    },
    deliveryTag: {
      ephemeralKey: 456n,
      viewTag: 789n,
    },
  };

  const fullNoteData: Partial<FullNoteData> = {
    owner,
    balance: {
      amount: 100n,
      token: 1n,
    },
    deliveryTag: {
      ephemeralKey: 456n,
      viewTag: 789n,
    },
  };

  const note = new Note(noteDataFromDb);
  const publicNote = Note.deserializePublicNote(note.serializePublicNote());
  expect(publicNote.ownerHash).toBe(noteDataFromDb.ownerHash);
  expect(publicNote.deliveryTag!.ephemeralKey).toBe(noteDataFromDb.deliveryTag!.ephemeralKey);
  expect(publicNote.deliveryTag!.viewTag).toBe(noteDataFromDb.deliveryTag!.viewTag);

  const { amount, token, viewTag, ownerHash: oh, ephemeralKey } = note.serializeAuthenticatedNote();

  const authenticatedNote = Note.deserializeAuthenticatedNote({
    ownerHash: oh.toString(16),
    viewTag: viewTag.toString(),
    token: token.toString(16),
    amount: amount.toString(16),
    ephemeralKey: ephemeralKey.toString(),
  });
  expect(authenticatedNote.ownerHash).toBe(noteDataFromDb.ownerHash);
  expect(authenticatedNote.deliveryTag!.ephemeralKey).toBe(noteDataFromDb.deliveryTag!.ephemeralKey);
  expect(authenticatedNote.deliveryTag!.viewTag).toBe(noteDataFromDb.deliveryTag!.viewTag);
  expect(authenticatedNote.balance?.amount).toBe(noteDataFromDb.balance!.amount);
  expect(authenticatedNote.balance?.token).toBe(noteDataFromDb.balance!.token);

  const fullNote = new Note(fullNoteData);
  expect(note.ownerHash).toBe(fullNote.ownerHash);
  expect(note.id).toBe(fullNote.id);
});

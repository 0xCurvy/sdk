import { buildPoseidon } from "circomlibjs";
import { expect, test } from "vitest";
import { Core } from "@/core";

test("Decode note shared secret", async () => {
  const core = await Core.init();

  const keyPairs = core.generateKeyPairs();
  const { babyJubjubPubKey } = core.getCurvyKeys(keyPairs.s, keyPairs.v);

  const recipientNoteData = core.sendNote(keyPairs.S, keyPairs.V, {
    ownerBabyJubjubPublicKey: babyJubjubPubKey,
    amount: 1000000000000000000n,
    token: BigInt("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"),
  });

  expect(recipientNoteData!.owner!.babyJubjubPubKey.x).toBe(BigInt(babyJubjubPubKey.split(".")[0]));
  expect(recipientNoteData!.owner!.babyJubjubPubKey.y).toBe(BigInt(babyJubjubPubKey.split(".")[1]));
});

test.skip("Scan notes", async () => {
  const NUM_NOTES = 10;
  const NUM_VALID_NOTES = 5;

  const core = await Core.init();
  const keyPair1 = core.generateKeyPairs();
  const keyPair2 = core.generateKeyPairs();

  const { S: ownerS, V: ownerV, babyJubjubPubKey: ownerBJPublicKey } = core.getCurvyKeys(keyPair1.s, keyPair1.v);

  const { S: otherS, V: otherV, babyJubjubPubKey: otherBJPublicKey } = core.getCurvyKeys(keyPair2.s, keyPair2.v);

  const notes: any = [];
  for (let i = 0; i < NUM_NOTES; i++) {
    const isOwnedNote = i < NUM_VALID_NOTES;
    const recipientNoteData = core.sendNote(isOwnedNote ? ownerS : otherS, isOwnedNote ? ownerV : otherV, {
      ownerBabyJubjubPublicKey: isOwnedNote ? ownerBJPublicKey : otherBJPublicKey,
      amount: 1000000000000000000n,
      token: BigInt("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"),
    });

    notes.push(recipientNoteData);
  }

  const scanResult = core.scanNotes(keyPair1.s, keyPair1.v, notes);
  const ownersNotes = scanResult.spendingPubKeys
    .filter((pubKey: any) => pubKey.length > 0)
    .map((pubKey: string) => BigInt(pubKey.split(".")[0]));

  expect(ownersNotes.length).toBe(NUM_VALID_NOTES);

  for (let i = 0; i < ownersNotes.length; i++) {
    const sharedSecret = ownersNotes[i];
    const noteSharedSecret = notes[i].owner.sharedSecret;
    expect(sharedSecret.toString()).toBe(noteSharedSecret.toString());
  }
});

test("Scan owned notes", async () => {
  const NUM_NOTES = 10;
  const NUM_VALID_NOTES = 5;

  const core = await Core.init();
  const keyPair1 = core.generateKeyPairs();
  const keyPair2 = core.generateKeyPairs();

  const { S: ownerS, V: ownerV, babyJubjubPubKey: ownerBJPublicKey } = core.getCurvyKeys(keyPair1.s, keyPair1.v);

  const { S: otherS, V: otherV, babyJubjubPubKey: otherBJPublicKey } = core.getCurvyKeys(keyPair2.s, keyPair2.v);

  const notes: any = [];
  for (let i = 0; i < NUM_NOTES; i++) {
    const isOwnedNote = i < NUM_VALID_NOTES;
    const recipientNoteData = core.sendNote(isOwnedNote ? ownerS : otherS, isOwnedNote ? ownerV : otherV, {
      ownerBabyJubjubPublicKey: isOwnedNote ? ownerBJPublicKey : otherBJPublicKey,
      amount: 1000000000000000000n,
      token: BigInt("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"),
    });

    notes.push(recipientNoteData);
  }

  const poseidon = await buildPoseidon();
  const publicNotes = notes.map((note: any) => ({
    ownerHash: poseidon.F.toObject(poseidon([...note.owner.babyJubjubPublicKey, note.owner.sharedSecret])),
    ephemeralKey: note.ephemeralKey,
    viewTag: note.viewTag,
  }));

  const ownedNotes = core.getNoteOwnershipData(publicNotes, keyPair1.s, keyPair1.v);

  expect(ownedNotes.length).toBe(NUM_VALID_NOTES);

  for (let i = 0; i < ownedNotes.length; i++) {
    const { sharedSecret } = ownedNotes[i];
    const noteSharedSecret = notes[i].owner.sharedSecret;
    expect(sharedSecret.toString()).toBe(noteSharedSecret.toString());
  }
});

test("Generate note ownership proof", async () => {
  const MAX_NOTES = 10;
  const NUM_NOTES = 5;

  const core = await Core.init();
  const keyPair = core.generateKeyPairs();

  const { S: ownerS, V: ownerV, babyJubjubPubKey: ownerBJPublicKey } = core.getCurvyKeys(keyPair.s, keyPair.v);

  const notes: any = [];
  for (let i = 0; i < NUM_NOTES; i++) {
    const recipientNoteData = core.sendNote(ownerS, ownerV, {
      ownerBabyJubjubPublicKey: ownerBJPublicKey,
      amount: 1000000000000000000n,
      token: BigInt("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"),
    });

    notes.push(recipientNoteData);
  }

  const poseidon = await buildPoseidon();
  const publicNotes = notes.map((note: any) => ({
    ownerHash: poseidon.F.toObject(poseidon([...note.owner.babyJubjubPublicKey, note.owner.sharedSecret])).toString(),
    ephemeralKey: note.ephemeralKey,
    viewTag: note.viewTag,
  }));

  const ownedNotes = core.getNoteOwnershipData(publicNotes, keyPair.s, keyPair.v);

  const { proof, publicSignals } = await core.generateNoteOwnershipProof(ownedNotes, ownerBJPublicKey);

  expect(proof).toBeDefined();
  expect(publicSignals).toBeDefined();
  expect(publicSignals.length).toBe(10);

  for (let i = 0; i < MAX_NOTES; i++) {
    if (i < NUM_NOTES) {
      expect(publicSignals[i].toString()).toBe(publicNotes[i].ownerHash.toString());
    } else {
      expect(publicSignals[i].toString()).toBe("0");
    }
  }
});

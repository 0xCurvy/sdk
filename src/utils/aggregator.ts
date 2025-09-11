import { poseidon2, poseidon3 } from "poseidon-lite";
import type { Note } from "@/types";

// TODO: Check if any of these functions are needed
const generateDummyOutputNote = (token?: string) => ({
  ownerHash: BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`).toString(),
  token: token || "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  amount: "0",
  viewTag: Buffer.from(crypto.getRandomValues(new Uint8Array(1)))
    .toString("hex")
    .slice(0, 2)
    .padStart(2, "0"),
  ephemeralKey: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`,
});

const padAggregationOutputNotes = (outputNotes: any, numberOfNotes: number = 2) => {
  if (outputNotes.length === 0) {
    throw new Error("Missing primary output note");
  }
  const paddedOutputNotes = [...outputNotes];

  for (let i = outputNotes.length; i < numberOfNotes; i++) {
    paddedOutputNotes.push(generateDummyOutputNote());
  }

  return paddedOutputNotes;
};

const generateOutputNoteHash = (outputNote: Note) => {
  return poseidon3([
    BigInt(outputNote.ownerHash),
    BigInt(outputNote.balance!.amount),
    BigInt(outputNote.balance!.token),
  ]);
};

const generateOutputsHash = (outputNotes: Note[]) => {
  const outputNoteHashes = outputNotes.map(generateOutputNoteHash);
  return poseidon2(outputNoteHashes);
};

const generateEphemeralKeysHash = (outputNotes: Note[]) => {
  const ephemeralKeys = outputNotes.map((note) => note.deliveryTag!.ephemeralKey);
  return poseidon2(ephemeralKeys);
};

const generateAggregationHash = (outputNotes: Note[]) => {
  const outputNoteHash = generateOutputsHash(outputNotes);
  const ephemeralKeyHash = generateEphemeralKeysHash(outputNotes);
  return poseidon2([outputNoteHash, ephemeralKeyHash]);
};

export {
  generateDummyOutputNote,
  padAggregationOutputNotes,
  generateOutputNoteHash,
  generateOutputsHash,
  generateEphemeralKeysHash,
  generateAggregationHash,
};

import { poseidon2, poseidon3 } from "poseidon-lite";

const generateDummyOutputNote = (token?: string) => ({
  ownerHash: BigInt(
    `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString(
      "hex"
    )}`
  ).toString(),
  token: token || "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  amount: "0",
  viewTag: Buffer.from(crypto.getRandomValues(new Uint8Array(1)))
    .toString("hex")
    .slice(0, 2)
    .padStart(2, "0"),
  ephemeralKey: `0x${Buffer.from(
    crypto.getRandomValues(new Uint8Array(31))
  ).toString("hex")}`,
});

const padAggregationOutputNotes = (
  outputNotes: any,
  numberOfNotes: number = 2
) => {
  if (outputNotes.length === 0) {
    throw new Error("Missing primary output note");
  }
  const paddedOutputNotes = [...outputNotes];

  for (let i = outputNotes.length; i < numberOfNotes; i++) {
    paddedOutputNotes.push(generateDummyOutputNote());
  }

  return paddedOutputNotes;
};

const generateOutputNoteHash = (outputNote: any) => {
  return poseidon3([
    BigInt(outputNote.ownerHash),
    BigInt(outputNote.amount),
    BigInt(outputNote.token),
  ]);
};

const generateOutputsHash = (outputNotes: any) => {
  const outputNoteHashes = outputNotes.map(generateOutputNoteHash);
  return poseidon2(outputNoteHashes);
};

const generateEphemeralKeysHash = (outputNotes: any[]) => {
  const ephemeralKeys = outputNotes.map((note: any) => note.ephemeralKey);
  return poseidon2(ephemeralKeys);
};

const generateAggregationHash = (outputNotes: any) => {
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

import type { HexString, InputNote, OutputNote } from "@/types";
import { decimalStringToBigInt } from "@/utils/decimal-conversions";
import { poseidonHash } from "@/utils/poseidon-hash";

const generateAggregationHash = (outputNotes: OutputNote[]) => {
  const sortedOutputNotes = outputNotes.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  const outputNotesHash = poseidonHash(sortedOutputNotes.map((note) => BigInt(note.id)));
  const ephemeralKeyHash = poseidonHash(
    sortedOutputNotes.map((note) => decimalStringToBigInt(note.deliveryTag.ephemeralKey)),
  );
  return poseidonHash([outputNotesHash, ephemeralKeyHash]);
};

const generateWithdrawalHash = (inputNotes: InputNote[], destinationAddress: HexString) => {
  const sortedInputNotes = inputNotes.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  const inputNotesHash = poseidonHash(sortedInputNotes.map((note) => BigInt(note.id)));
  return poseidonHash([inputNotesHash, BigInt(destinationAddress)]);
};

export { generateAggregationHash, generateWithdrawalHash };

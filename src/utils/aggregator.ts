import type { HexString, InputNote, OutputNote } from "@/types";
import { poseidonHash } from "@/utils/poseidon-hash";
import { decimalStringToBigInt } from '@/utils/decimal-conversions';

const generateAggregationHash = (outputNotes: OutputNote[]) => {
  const outputNotesHash = poseidonHash(outputNotes.map((note) => BigInt(note.id)));
  const ephemeralKeyHash = poseidonHash(outputNotes.map((note) => decimalStringToBigInt(note.deliveryTag!.ephemeralKey)));
  return poseidonHash([outputNotesHash, ephemeralKeyHash]);
};

const generateWithdrawalHash = (inputNotes: InputNote[], destinationAddress: HexString) => {
  const inputNotesHash = poseidonHash(inputNotes.map((note) => BigInt(note.id)));
  return poseidonHash([inputNotesHash, BigInt(destinationAddress)]);
};

export { generateAggregationHash, generateWithdrawalHash };

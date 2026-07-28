import type { OutputNote } from "@/note";
import { decimalStringToBigInt } from "@/utils/encoding";
import { poseidonHash } from "@/utils/hash/poseidonHash";

/**
 * Computes the aggregation authorization hash expected by the v1 aggregation
 * circuit.
 *
 * The legacy circuit accepts each ephemeral public key as one field element.
 * Its historical wire encoding packs `X.Y` into `(X << 256) | Y`; assignment
 * to the circuit reduces that packed value into the BN254 scalar field.
 *
 * Do not use this for v2 aggregations. The v2 hash binds X and Y separately to
 * avoid the collisions inherent in reducing a packed 512-bit value.
 */
const generateLegacyAggregationHash = (outputNotes: OutputNote[]) => {
  const sortedOutputNotes = [...outputNotes].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  const outputNotesHash = poseidonHash(sortedOutputNotes.map((note) => BigInt(note.id)));
  const ephemeralKeyHash = poseidonHash(
    sortedOutputNotes.map((note) => decimalStringToBigInt(note.deliveryTag.ephemeralKey)),
  );
  return poseidonHash([outputNotesHash, ephemeralKeyHash]);
};

export { generateLegacyAggregationHash };

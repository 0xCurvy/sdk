import type { OutputNote } from "@/note";
import { poseidonHash } from "@/utils/hash/poseidonHash";

/**
 * Computes the aggregation hash committing to a set of output notes.
 *
 * Output notes are sorted by id, then the poseidon hash of their ids is combined
 * with the poseidon hash of their ephemeral keys. Each ephemeral key's X and Y
 * are hashed as SEPARATE field elements (via a per-note Poseidon([x, y])) — never
 * packed into one ~512-bit value, which Poseidon would silently reduce mod p and
 * so fail to bind the exact key. The result is order-independent (notes sorted first).
 *
 * @example
 * const hash = generateAggregationHash([
 *   { id: "2", ownerHash: "0x1", balance: { amount: "1", token: "0x1" }, deliveryTag: { ephemeralKey: "1.2", viewTag: "0x0" } },
 *   { id: "1", ownerHash: "0x2", balance: { amount: "2", token: "0x1" }, deliveryTag: { ephemeralKey: "3.4", viewTag: "0x0" } },
 * ]);
 * // hash is a bigint, identical regardless of the order the two notes were passed in
 */
const generateAggregationHash = (outputNotes: OutputNote[]) => {
  const sortedOutputNotes = [...outputNotes].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  const outputNotesHash = poseidonHash(sortedOutputNotes.map((note) => BigInt(note.id)));
  const ephemeralKeyHash = poseidonHash(
    sortedOutputNotes.map((note) => {
      const [x, y] = note.deliveryTag.ephemeralKey.split(".");
      return poseidonHash([BigInt(x), BigInt(y)]);
    }),
  );
  return poseidonHash([outputNotesHash, ephemeralKeyHash]);
};

export { generateAggregationHash };

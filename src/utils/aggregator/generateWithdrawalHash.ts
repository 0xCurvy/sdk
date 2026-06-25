import type { InputNote } from "@/note";
import type { HexString } from "@/types/helper";
import { poseidonHash } from "@/utils/hash/poseidonHash";

/**
 * Computes the withdrawal hash committing to a set of input notes and a destination address.
 *
 * Input notes are sorted by id, then the poseidon hash of their ids is
 * combined with the destination address (interpreted as a bigint). The result
 * is independent of the order in which input notes are supplied.
 *
 * @example
 * const hash = generateWithdrawalHash(
 *   [
 *     { id: "2", nullifier: "0x0", owner: { babyJubjubPublicKey: { x: "1", y: "2" }, sharedSecret: "3" }, balance: { amount: "1", token: "0x1" } },
 *     { id: "1", nullifier: "0x0", owner: { babyJubjubPublicKey: { x: "4", y: "5" }, sharedSecret: "6" }, balance: { amount: "2", token: "0x1" } },
 *   ],
 *   "0x1234567890123456789012345678901234567890",
 * );
 * // hash is a bigint deterministic for the same notes + address
 */
const generateWithdrawalHash = (inputNotes: InputNote[], destinationAddress: HexString) => {
  const sortedInputNotes = inputNotes.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  const inputNotesHash = poseidonHash(sortedInputNotes.map((note) => BigInt(note.id)));
  return poseidonHash([inputNotesHash, BigInt(destinationAddress)]);
};

export { generateWithdrawalHash };

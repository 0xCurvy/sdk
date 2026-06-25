// `proving` module — primitives for building / consuming ZK proofs:
// the v2 note-data cipher (`encryptAmountToken`/`decryptAmountToken`,
// AES-256-CTR additive field-OTP), `MerkleTree` (IMT), BabyJubjub/EdDSA primitives,
// and the v2 circuit witness builders (aggregation, withdrawal, pending-notes-commitment).
//
// The `Note` class itself lives in the `note` domain module (`@/note`); it is
// re-exported here so circuit-witness consumers can `import { Note } from
// "@0xcurvy/curvy-sdk/proving"`.

export type { BabyJubjubPublicKey, NoteOwner } from "@/note";
export { Note, type NoteParams } from "@/note";
export * from "./babyJubjub";
export * from "./balanceCipher";
export * from "./circuitInputs";
export * from "./groth16";
export * from "./merkleTree";
export * from "./pendingNotesCommitmentInputs";
export * from "./prover";
export * from "./utils";
export * from "./witnessFromNotes";

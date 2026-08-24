// Primitives for local proof construction: note-data encryption, Rust-backed
// Merkle trees, BabyJubjub/EdDSA, circuit witnesses, and Groth16 proving.
//
// The `Note` class itself lives in the `note` domain module (`@/note`); it is
// re-exported here so circuit-witness consumers can `import { Note } from
// "@0xcurvy/curvy-sdk/proving"`.

export type { BabyJubjubPublicKey, NoteOwner } from "@/note";
export { Note, type NoteParams } from "@/note";
export * from "./babyJubjub";
export * from "./balanceCipher";
export * from "./circuitInputs";
export * from "./circuitKeyCache";
export * from "./groth16";
export * from "./merkleTree";
export * from "./pendingNotesCommitmentInputs";
export * from "./prover";
export * from "./rustProver";
export * from "./types";
export * from "./utils";
export * from "./witnessFromNotes";

// The note domain model. Owned by the `note` module (the unified `Note` class +
// its converters consume these); re-exported via `@/note` (and via `@/proving`
// for the circuit-witness builders).

type BabyJubjubPublicKey = {
  x: bigint;
  y: bigint;
};

// The note owner: a BabyJubjub public key + the ECDH shared secret. `ownerHash`
// (poseidon over these three) is what the note commits to on-chain.
type NoteOwner = {
  babyJubjubPublicKey: BabyJubjubPublicKey;
  sharedSecret: bigint;
};

// ── Aggregator backend wire shapes (string-encoded JSON) ────────────────────
// These are the serialized forms the planner sends to / receives from the
// aggregator backend. The ephemeral key travels as the "x.y" decimal-point
// string of the public point R.

type InputNote = {
  id: string;
  nullifier: string;
  owner: {
    babyJubjubPublicKey: {
      x: string;
      y: string;
      serialized?: string;
    };
    sharedSecret: string;
  };
  balance: {
    amount: string;
    token: string;
  };
};

type OutputNote = {
  id: string;
  ownerHash: string;
  balance: {
    amount: string;
    token: string;
  };
  deliveryTag: {
    ephemeralKey: string;
    viewTag: string;
  };
};

type FullNoteData = InputNote & OutputNote;

export type { BabyJubjubPublicKey, NoteOwner, InputNote, OutputNote, FullNoteData };

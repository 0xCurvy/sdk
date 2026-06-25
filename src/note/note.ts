import { Buffer } from "buffer";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import type { FullNoteData, InputNote, NoteOwner, OutputNote } from "./types";

// The single Curvy note. Holds the owner (BabyJubjub pubkey + ECDH shared
// secret), the amount/token, the ephemeral PUBLIC key `R = r·B` as a `[x, y]`
// point (NOT the private scalar `r` — the sender derives `R` once and the note
// only ever carries the public point the recipient sees), and the view tag.
//
// `id`/`nullifier`/`ownerHash` are derived (poseidon). The `serialize*` helpers
// emit the aggregator backend's string-encoded wire shapes; the ephemeral key
// travels as the `"x.y"` decimal-point string of `R`.

export type NoteParams = {
  amount: bigint;
  token: bigint;
  owner: NoteOwner;
  /** Ephemeral PUBLIC key `R = r·B` as `[x, y]`. */
  ephemeralKey: [bigint, bigint];
  viewTag: bigint;
};

export class Note {
  amount: bigint;
  token: bigint;
  owner: NoteOwner;
  ephemeralKey: [bigint, bigint];
  viewTag: bigint;

  constructor(params: NoteParams) {
    this.amount = params.amount;
    this.token = params.token;
    this.owner = params.owner;
    this.ephemeralKey = params.ephemeralKey;
    this.viewTag = params.viewTag;
  }

  static computeOwnerHash(owner: NoteOwner): bigint {
    return poseidonHash([owner.babyJubjubPublicKey.x, owner.babyJubjubPublicKey.y, owner.sharedSecret]);
  }

  get ownerHash(): bigint {
    return Note.computeOwnerHash(this.owner);
  }

  get id(): bigint {
    return poseidonHash([this.ownerHash, this.amount, this.token]);
  }

  get nullifier(): bigint {
    return poseidonHash([this.owner.sharedSecret, this.owner.babyJubjubPublicKey.x, this.owner.babyJubjubPublicKey.y]);
  }

  // ── Aggregator backend wire serializers ────────────────────────────────────
  // Used when sending a withdrawal/aggregation request to the aggregator backend.
  serializeInputNote(): InputNote {
    return {
      id: this.id.toString(),
      nullifier: this.nullifier.toString(),
      owner: {
        babyJubjubPublicKey: {
          x: this.owner.babyJubjubPublicKey.x.toString(),
          y: this.owner.babyJubjubPublicKey.y.toString(),
          serialized: `${this.owner.babyJubjubPublicKey.x}.${this.owner.babyJubjubPublicKey.y}`,
        },
        sharedSecret: this.owner.sharedSecret.toString(),
      },
      balance: {
        amount: this.amount.toString(),
        token: this.token.toString(),
      },
    };
  }

  serializeOutputNote(): OutputNote {
    return {
      id: this.id.toString(),
      ownerHash: this.ownerHash.toString(),
      balance: {
        amount: this.amount.toString(),
        token: this.token.toString(),
      },
      deliveryTag: {
        // R as the "x.y" decimal-point string.
        ephemeralKey: `${this.ephemeralKey[0]}.${this.ephemeralKey[1]}`,
        // padStart(2): the Go-WASM scan slices viewTag[:2]; a 1-char hex tag
        // (e.g. "0" for viewTag 0n) would panic the scan batch. Value-neutral
        // for downstream BigInt() parsing and not part of the aggregation hash.
        viewTag: this.viewTag.toString(16).padStart(2, "0"),
      },
    };
  }

  serializeFullNote(): FullNoteData {
    return {
      ...this.serializeInputNote(),
      ...this.serializeOutputNote(),
    };
  }

  /** A dummy note (placeholder owner, random secret + ephemeral point) used to
   *  pad an aggregation's output slots up to the circuit's `maxOutputs`. */
  static random(params: { amount: bigint; token: bigint }): Note {
    const rnd = () => BigInt(`0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`);
    return new Note({
      amount: params.amount,
      token: params.token,
      owner: { babyJubjubPublicKey: { x: 0n, y: 0n }, sharedSecret: rnd() },
      ephemeralKey: [rnd(), rnd()],
      viewTag: 0n,
    });
  }
}

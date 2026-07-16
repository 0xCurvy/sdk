import type { Signature } from "@/types/core";
import {
  ephemeralPubKey as rustEphemeralPubKey,
  pubFromPrivateKey as rustPubFromPrivateKey,
  sign as rustSign,
} from "./rustCore";

// BabyJubjub / EdDSA-Poseidon primitives shared by the circuit-witness builders:
// ephemeral public-key derivation, public-key recovery, and message signing.
//
// Backed by the shared Rust/WASM core and byte-identical to the circomlibjs
// `buildEddsa()` API (covered by committed parity vectors).

/** BabyJubjub public key `[x, y]` derived from a hex private key (`prv2pub`). */
export const pubFromPrivateKey = (privateKeyHex: string): [bigint, bigint] => {
  return rustPubFromPrivateKey(privateKeyHex);
};

/**
 * The ephemeral PUBLIC key `R = r·B` (BabyJubjub generator `Base8`) for an
 * ephemeral private scalar `r` (`Note.ephemeralKey`). This is the 2-coord
 * `[x, y]` the on-chain `Note.ephemeralKey` field expects (`TypesV2.sol`), and
 * the value the recipient reads from `PendingNotes` to (a) run ECDH discovery
 * and (b) re-derive the note-cipher nonce — so the cipher MUST be keyed off this
 * public `R`, never the private `r` (the recipient never sees `r`).
 */
export const ephemeralPubKey = (scalar: bigint): [bigint, bigint] => {
  return rustEphemeralPubKey(scalar);
};

// EdDSA-Poseidon signature; same primitive the v2 circuits verify per output
// note (aggregation) and per withdrawal.
export const sign = (message: bigint, privateKeyHex: string): Signature => {
  return rustSign(message, privateKeyHex);
};

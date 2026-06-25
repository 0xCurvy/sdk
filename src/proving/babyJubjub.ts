import { Base8, mulPointEscalar } from "@zk-kit/baby-jubjub";
import { derivePublicKey, signMessage } from "@zk-kit/eddsa-poseidon";
import { Buffer } from "buffer";
import type { Signature } from "@/types/core";

// BabyJubjub / EdDSA-Poseidon primitives shared by the circuit-witness builders:
// ephemeral public-key derivation, public-key recovery, and message signing.
//
// Backed by @zk-kit/baby-jubjub + @zk-kit/eddsa-poseidon (stateless). These are
// byte-identical to the circomlibjs `buildEddsa()` API they replaced as long as
// the private key is passed as the SAME `Buffer.from(hex, "hex")` encoding (a
// raw hex *string* hashes differently — always go through the Buffer).

/** BabyJubjub public key `[x, y]` derived from a hex private key (`prv2pub`). */
export const pubFromPrivateKey = (privateKeyHex: string): [bigint, bigint] => {
  const [x, y] = derivePublicKey(Buffer.from(privateKeyHex, "hex"));
  return [x, y];
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
  const [x, y] = mulPointEscalar(Base8, scalar);
  return [x, y];
};

// EdDSA-Poseidon signature; same primitive the v2 circuits verify per output
// note (aggregation) and per withdrawal.
export const sign = (message: bigint, privateKeyHex: string): Signature => {
  const signature = signMessage(Buffer.from(privateKeyHex, "hex"), message);
  return {
    R8: [signature.R8[0], signature.R8[1]],
    S: signature.S,
  };
};

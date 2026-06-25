import { pubFromPrivateKey } from "@/proving/babyJubjub";
import { generateRandomBigInt } from "@/proving/utils";

// Test-only BabyJubjub keypair helpers. `generateKeypair` is not part of the
// SDK's public surface — production code derives owner pubkeys via the Core WASM
// (`getBabyJubjubPublicKey`); only tests/fixtures mint throwaway keypairs.

/** A BabyJubjub test keypair: hex private key + a bigint-decomposed pubkey. */
export type Keypair = {
  privKeyHex: string;
  pubKeyBigInt: [bigint, bigint];
};

/** Deterministic test keypair from a fixed hex private key. */
export const keypairFromPriv = (privKeyHex: string): Keypair => ({
  privKeyHex,
  pubKeyBigInt: pubFromPrivateKey(privKeyHex),
});

/** Random BabyJubjub test keypair (31-byte private key). */
export const generateKeypair = (): Keypair => keypairFromPriv(generateRandomBigInt(31).toString(16).padStart(62, "0"));

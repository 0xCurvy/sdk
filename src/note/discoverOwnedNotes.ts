import { decryptAmountToken } from "@/proving/balanceCipher";
import { noteId as rustNoteId, ownerHash as rustOwnerHash } from "@/proving/rustCore";
import type { SyncedLeaf } from "./notesTreeSync";

// ─────────────────────────────────────────────────────────────────────────────
// Decrypt-local note discovery (7.2). Because aggregation outputs now carry the
// amount/token encrypted (CTR field-OTP) in the on-chain delivery data, a client
// can discover AND value its owned notes purely from the public synced leaf feed
// — no per-note backend ownership round-trip (the old O(N) `noteScan` path).
//
// The viewTag pre-filter + ECDH ownership match (viewing key × ephemeral `R`)
// live in the WASM `Core`, so they're injected as an `OwnershipResolver`; this
// module owns the decrypt + the integrity gate.
// ─────────────────────────────────────────────────────────────────────────────

/** ECDH result for a leaf the resolver claims as ours. */
export type OwnershipMatch = {
  /** Shared secret `ECDH(viewKey, R)` derived on the recipient side. */
  sharedSecret: bigint;
  /** The note owner's BabyJubjub public key (for the ownerHash). */
  ownerPub: [bigint, bigint];
};

/**
 * Decide whether a synced leaf is ours and, if so, supply the ECDH-derived
 * `sharedSecret` + owner pubkey. Injected: production wires the WASM `Core`
 * viewTag trial-decryption; tests supply a known map. Return `null` to skip.
 *
 * Optional `prescan` is a batch warm-up: `discoverOwnedNotes` calls it once with
 * the whole delta before per-leaf resolution, letting a resolver trial-decrypt
 * the entire batch in a single pass (the WASM-Core resolver issues ONE
 * `scanNotes` for the delta instead of one call per leaf). A resolver without it
 * is treated purely per-leaf — backward compatible with map-backed resolvers.
 */
export type OwnershipResolver = ((leaf: SyncedLeaf) => Promise<OwnershipMatch | null>) & {
  prescan?: (leaves: SyncedLeaf[]) => Promise<void>;
};

export type OwnedNote = {
  noteId: string;
  /** Slot in the committed notes tree — the inclusion-proof position for a spend. */
  leafIndex: number;
  amount: bigint;
  token: bigint;
  sharedSecret: bigint;
  ownerPub: [bigint, bigint];
  ephemeralKey: [bigint, bigint];
  viewTag: number;
};

const ownerHashOf = (pub: [bigint, bigint], sharedSecret: bigint): bigint =>
  rustOwnerHash(pub[0], pub[1], sharedSecret);

const noteIdOf = (ownerHash: bigint, amount: bigint, token: bigint): bigint => rustNoteId(ownerHash, amount, token);

/**
 * Discover the owned notes in a batch of synced leaves. For each leaf the
 * resolver claims: decrypt amount/token (or read plaintext for autoShield
 * notes), recompute `noteId = Poseidon([ownerHash, amount, token])`, and KEEP
 * only leaves whose recomputed id matches the on-chain leaf. The commitment is
 * the MAC — a corrupted/forged ciphertext yields a wrong id and is dropped, so
 * the cipher's malleability can never make us accept a wrong amount.
 */
export async function discoverOwnedNotes(leaves: SyncedLeaf[], resolve: OwnershipResolver): Promise<OwnedNote[]> {
  await resolve.prescan?.(leaves); // batch trial-decrypt up front, if the resolver supports it
  const owned: OwnedNote[] = [];
  for (const leaf of leaves) {
    const match = await resolve(leaf);
    if (!match || !leaf.ephemeralKey) continue; // not ours, or no delivery data to value

    const ephemeralKey: [bigint, bigint] = [BigInt(leaf.ephemeralKey[0]), BigInt(leaf.ephemeralKey[1])];

    let amount: bigint;
    let token: bigint;
    if (leaf.isPlaintext) {
      amount = BigInt(leaf.amount ?? "0");
      token = BigInt(leaf.token ?? "0");
    } else {
      ({ amount, token } = await decryptAmountToken({
        encryptedAmount: BigInt(leaf.amount ?? "0"),
        encryptedToken: BigInt(leaf.token ?? "0"),
        sharedSecret: match.sharedSecret,
        ephemeralKey,
      }));
    }

    const ownerHash = ownerHashOf(match.ownerPub, match.sharedSecret);
    if (noteIdOf(ownerHash, amount, token).toString() !== leaf.noteId) continue; // integrity gate

    owned.push({
      noteId: leaf.noteId,
      leafIndex: leaf.index,
      amount,
      token,
      sharedSecret: match.sharedSecret,
      ownerPub: match.ownerPub,
      ephemeralKey,
      viewTag: leaf.viewTag ?? 0,
    });
  }

  return owned;
}

import { describe, expect, it } from "vitest";
import { ephemeralPubKey } from "@/proving/babyJubjub";
import { encryptAmountToken } from "@/proving/balanceCipher";
import { generateKeypair } from "@/test/keypair";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import { discoverOwnedNotes, type OwnershipResolver } from "./discoverOwnedNotes";
import type { SyncedLeaf } from "./notesTreeSync";

const ownerHashOf = (pub: [bigint, bigint], sharedSecret: bigint) => poseidonHash([pub[0], pub[1], sharedSecret]);
const noteIdOf = (pub: [bigint, bigint], ss: bigint, amount: bigint, token: bigint) =>
  poseidonHash([ownerHashOf(pub, ss), amount, token]);

// Build the on-chain leaf an aggregation output would produce for a recipient:
// real R = r·B, amount/token CTR-encrypted under (sharedSecret, R).
async function encryptedLeaf(params: {
  index: number;
  pub: [bigint, bigint];
  sharedSecret: bigint;
  r: bigint;
  amount: bigint;
  token: bigint;
}): Promise<SyncedLeaf> {
  const R = ephemeralPubKey(params.r);
  const { encryptedAmount, encryptedToken } = await encryptAmountToken({
    amount: params.amount,
    token: params.token,
    sharedSecret: params.sharedSecret,
    ephemeralKey: R,
  });
  return {
    index: params.index,
    noteId: noteIdOf(params.pub, params.sharedSecret, params.amount, params.token).toString(),
    ephemeralKey: [R[0].toString(), R[1].toString()],
    viewTag: 7,
    amount: encryptedAmount.toString(),
    token: encryptedToken.toString(),
    isPlaintext: false,
  };
}

describe("discoverOwnedNotes (decrypt-local discovery)", () => {
  it("decrypts an owned encrypted leaf and recovers amount/token/leafIndex", async () => {
    const kp = generateKeypair();
    const pub = kp.pubKeyBigInt;
    const sharedSecret = 0xabc123n;
    const leaf = await encryptedLeaf({ index: 4, pub, sharedSecret, r: 0xdeadn, amount: 1_500_000n, token: 2n });

    const resolve: OwnershipResolver = async (l) => (l.noteId === leaf.noteId ? { sharedSecret, ownerPub: pub } : null);

    const owned = await discoverOwnedNotes([leaf], resolve);
    expect(owned).toHaveLength(1);
    expect(owned[0]).toMatchObject({ noteId: leaf.noteId, leafIndex: 4, amount: 1_500_000n, token: 2n, viewTag: 7 });
  });

  it("skips leaves the resolver doesn't claim", async () => {
    const kp = generateKeypair();
    const leaf = await encryptedLeaf({
      index: 0,
      pub: kp.pubKeyBigInt,
      sharedSecret: 1n,
      r: 2n,
      amount: 9n,
      token: 1n,
    });
    const owned = await discoverOwnedNotes([leaf], async () => null);
    expect(owned).toHaveLength(0);
  });

  it("reads a plaintext (autoShield) leaf without decrypting", async () => {
    const kp = generateKeypair();
    const pub = kp.pubKeyBigInt;
    const sharedSecret = 0x55n;
    const R = ephemeralPubKey(0x66n);
    const amount = 3_000_000n;
    const token = 1n;
    const leaf: SyncedLeaf = {
      index: 9,
      noteId: noteIdOf(pub, sharedSecret, amount, token).toString(),
      ephemeralKey: [R[0].toString(), R[1].toString()],
      viewTag: 0,
      amount: amount.toString(),
      token: token.toString(),
      isPlaintext: true,
    };
    const owned = await discoverOwnedNotes([leaf], async () => ({ sharedSecret, ownerPub: pub }));
    expect(owned).toHaveLength(1);
    expect(owned[0]).toMatchObject({ amount, token, leafIndex: 9 });
  });

  it("calls resolver.prescan ONCE with the whole batch before any per-leaf resolution", async () => {
    const kp = generateKeypair();
    const pub = kp.pubKeyBigInt;
    const sharedSecret = 0x77n;
    const leaves = [
      await encryptedLeaf({ index: 0, pub, sharedSecret, r: 0x10n, amount: 5n, token: 1n }),
      await encryptedLeaf({ index: 1, pub, sharedSecret, r: 0x11n, amount: 6n, token: 1n }),
    ];

    const calls: string[] = [];
    const resolve: OwnershipResolver = async (l) => {
      calls.push(`resolve:${l.index}`);
      return { sharedSecret, ownerPub: pub };
    };
    resolve.prescan = async (ls) => {
      calls.push(`prescan:${ls.length}`);
    };

    await discoverOwnedNotes(leaves, resolve);
    // prescan runs first, exactly once, seeing the full delta; then per-leaf.
    expect(calls).toEqual(["prescan:2", "resolve:0", "resolve:1"]);
  });

  it("integrity gate: drops a leaf whose decrypted value doesn't recompute the noteId", async () => {
    const kp = generateKeypair();
    const pub = kp.pubKeyBigInt;
    const sharedSecret = 0x999n;
    const leaf = await encryptedLeaf({ index: 1, pub, sharedSecret, r: 0x1234n, amount: 42n, token: 1n });
    // tamper the ciphertext → decrypt yields a wrong amount → noteId mismatch
    const tampered: SyncedLeaf = { ...leaf, amount: (BigInt(leaf.amount ?? "0") + 1n).toString() };

    const owned = await discoverOwnedNotes([tampered], async () => ({ sharedSecret, ownerPub: pub }));
    expect(owned).toHaveLength(0);
  });
});

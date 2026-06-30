import { describe, expect, it, vi } from "vitest";
import { Note } from "@/note";
import { pubFromPrivateKey } from "./babyJubjub";
import type { SuppliedInclusionProofs } from "./witnessFromNotes";
import { buildAggregationWitnessBundle } from "./witnessFromNotes";

// C3 regression: the change-to-self note must be COHERENTLY sealed (real ECDH
// stealth delivery) so it survives a rescan / fresh device. Before the fix it
// used a random `sharedSecret` uncorrelated with its ephemeral key, so the owner
// could never re-discover it — the change (often the largest output) was lost.

const OWNER_PRIV = `0x${"11".repeat(31)}`; // faithful 31-byte BabyJubjub private key
const TOKEN = 1n;
const ROOT = 123456789n;

const ownerPub = pubFromPrivateKey(OWNER_PRIV);
// A pubkey that is definitely NOT the sender's (used for the recipient + the
// wrong-owner rejection case). Perturbing the coords guarantees inequality.
const otherPub: [bigint, bigint] = [ownerPub[0] + 1n, ownerPub[1] + 1n];

const ownedInput = (amount: bigint, sharedSecret: bigint): Note =>
  new Note({
    amount,
    token: TOKEN,
    owner: { babyJubjubPublicKey: { x: ownerPub[0], y: ownerPub[1] }, sharedSecret },
    ephemeralKey: [0n, 0n],
    viewTag: 0n,
  });

// Two committed inputs (total 1000) + matching supplied inclusion proofs at one root.
const inputNotes = [ownedInput(600n, 1n), ownedInput(400n, 2n)];
const supplied: SuppliedInclusionProofs = {
  notesRoot: ROOT,
  proofs: inputNotes.map((n, i) => ({ leaf: n.id, index: i, root: ROOT, siblings: Array(30).fill(0n) })),
};

// One recipient gets 700 (no fees) => change to self = 300.
const baseParams = {
  inputNotes,
  ownerBjjPrivateKeyHex: OWNER_PRIV,
  recipients: [{ amount: 700n, ownerPub: otherPub, sharedSecret: 9n }],
  feeNotePublicKey: [1n, 2n] as [bigint, bigint],
  protocolFeePerThousand: 0n,
  gasFee: 0n,
  supplied,
  maxInputs: 2,
  maxOutputs: 3,
  treeDepth: 30,
};

describe("buildAggregationWitnessBundle change-note sealing (C3)", () => {
  it("seals the change-to-self note via the injected sealer (discoverable)", async () => {
    // A coherently-delivered change note (as `core.sendNote` to self would return).
    const sealed = new Note({
      amount: 300n,
      token: TOKEN,
      owner: { babyJubjubPublicKey: { x: ownerPub[0], y: ownerPub[1] }, sharedSecret: 777n },
      ephemeralKey: [42n, 43n],
      viewTag: 5n,
    });
    const sealChange = vi.fn(async (_amount: bigint) => sealed);

    const { outputNotes } = await buildAggregationWitnessBundle({ ...baseParams, sealChange });

    expect(sealChange).toHaveBeenCalledWith(300n);
    // outputNotes = [recipient(700), change(300), zero-pad]
    const change = outputNotes[1];
    expect(change.id).toBe(sealed.id);
    expect(change.amount).toBe(300n);
    // Coherent delivery — NOT a random ephemeral; the owner can re-discover it.
    expect(change.owner.sharedSecret).toBe(777n);
    expect(change.ephemeralKey).toEqual([42n, 43n]);
    expect(change.viewTag).toBe(5n);
  });

  it("rejects a sealer that does not own exactly `change` for the sender", async () => {
    const wrongAmount = vi.fn(
      async () =>
        new Note({
          amount: 999n, // != change (300)
          token: TOKEN,
          owner: { babyJubjubPublicKey: { x: ownerPub[0], y: ownerPub[1] }, sharedSecret: 1n },
          ephemeralKey: [1n, 1n],
          viewTag: 0n,
        }),
    );
    await expect(buildAggregationWitnessBundle({ ...baseParams, sealChange: wrongAmount })).rejects.toThrow(
      "sealed change note must own",
    );

    const wrongOwner = vi.fn(
      async () =>
        new Note({
          amount: 300n,
          token: TOKEN,
          owner: { babyJubjubPublicKey: { x: otherPub[0], y: otherPub[1] }, sharedSecret: 1n }, // not the sender
          ephemeralKey: [1n, 1n],
          viewTag: 0n,
        }),
    );
    await expect(buildAggregationWitnessBundle({ ...baseParams, sealChange: wrongOwner })).rejects.toThrow(
      "sealed change note must own",
    );
  });

  it("falls back to a self-owned change note when no sealer is provided (legacy)", async () => {
    const { outputNotes } = await buildAggregationWitnessBundle(baseParams);
    const change = outputNotes[1];
    expect(change.amount).toBe(300n);
    expect(change.owner.babyJubjubPublicKey.x).toBe(ownerPub[0]);
    expect(change.owner.babyJubjubPublicKey.y).toBe(ownerPub[1]);
  });
});

describe("buildAggregationWitnessBundle fee-note sealing (M4)", () => {
  // baseParams.feeNotePublicKey is [1n, 2n]; the sealed fee note must own that key.
  it("seals the protocol fee note via the injected sealer when the fee is non-zero", async () => {
    const sealed = new Note({
      amount: 50n,
      token: TOKEN,
      owner: { babyJubjubPublicKey: { x: 1n, y: 2n }, sharedSecret: 888n },
      ephemeralKey: [7n, 8n],
      viewTag: 9n,
    });
    const sealFee = vi.fn(async (_amount: bigint) => sealed);

    // gasFee 50 => feeAmount 50 (non-zero), change = 1000 - 700 - 50 = 250.
    const { feeNote } = await buildAggregationWitnessBundle({ ...baseParams, gasFee: 50n, sealFee });

    expect(sealFee).toHaveBeenCalledWith(50n);
    expect(feeNote.id).toBe(sealed.id);
    expect(feeNote.owner.sharedSecret).toBe(888n); // coherent — the collector can recompute it
    expect(feeNote.ephemeralKey).toEqual([7n, 8n]);
  });

  it("throws on a non-zero fee with no sealer (refuses to mint an uncollectable fee note)", async () => {
    // COR-12: without `sealFee` the fee note would get a random sharedSecret and be
    // permanently uncollectable, so a non-zero fee without a sealer must throw.
    await expect(buildAggregationWitnessBundle({ ...baseParams, gasFee: 50n })).rejects.toThrow(/uncollectable/);
  });
});

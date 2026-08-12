import { beforeAll, describe, expect, it } from "vitest";
import { Core } from "@/core";
import type { CurvyKeyPairs } from "@/core/types";
import { discoverOwnedNotes } from "@/note/discoverOwnedNotes";
import type { SyncedLeaf } from "@/note/notesTreeSync";
import { encryptAmountToken } from "@/proving/balanceCipher";
import { createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import { coreOwnershipResolver } from "./seams";

// Real-WASM coverage for the local-ECDH resolver. Unlike seams.test.ts (which
// drives a FAKE core.scanNotes and only proves the format bridge in isolation),
// this exercises the genuine Rust WASM scan to prove the END-TO-END wiring: a v3
// indexer leaf — ephemeralKey as a [x, y] decimal pair, viewTag as a NUMBER —
// bridged to the scan's "x.y" + unpadded-hex shape actually claims the note.
// This is the silent-failure surface a fake core can't catch.

let core: Core;
beforeAll(() => {
  core = new Core();
});

/** A config whose active account carries `keys`, wired to the real WASM core. */
function configFor(keys: CurvyKeyPairs) {
  const account = fakeCurvyAccount({ keyPairs: keys });
  const config = createFakeConfig({
    core,
    activeAccountId: account.id,
    liveAccounts: new Map([[account.id, account]]),
  });
  return { config, accountId: account.id };
}

/**
 * Reproduce the on-chain delivery a sender emits to `recipient`, shaped the way
 * the indexer hands it to a client: `ephemeralKey: [x, y]` decimal strings and a
 * NUMERIC `viewTag` (the `uint16` value), not the core's own "x.y"/hex strings.
 */
async function deliveredLeaf(recipient: CurvyKeyPairs, index: number): Promise<SyncedLeaf> {
  const { R, viewTag } = await core.send(recipient.S, recipient.V);
  const [x, y] = R.split(".");
  return {
    index,
    noteId: String(9000 + index),
    ephemeralKey: [x, y],
    viewTag: Number.parseInt(viewTag.startsWith("0x") ? viewTag.slice(2) : viewTag, 16),
  };
}

/** A complete encrypted leaf whose commitment can reject view-tag false positives. */
async function encryptedLeaf(recipient: CurvyKeyPairs, index: number) {
  const note = await core.sendNote(recipient.S, recipient.V, {
    ownerBabyJubjubPublicKey: recipient.babyJubjubPublicKey,
    amount: BigInt(9_000 + index),
    token: 7n,
  });
  const encrypted = await encryptAmountToken({
    amount: note.amount,
    token: note.token,
    sharedSecret: note.owner.sharedSecret,
    ephemeralKey: note.ephemeralKey,
  });
  const leaf: SyncedLeaf = {
    index,
    noteId: note.id.toString(),
    ephemeralKey: note.ephemeralKey.map(String) as [string, string],
    viewTag: Number(note.viewTag),
    amount: encrypted.encryptedAmount.toString(),
    token: encrypted.encryptedToken.toString(),
    isPlaintext: false,
  };
  return { leaf, note };
}

describe("coreOwnershipResolver (real WASM scan)", () => {
  it("claims a delivered note and recovers the matching (sharedSecret, ownerPub)", async () => {
    const recipient = await core.generateKeyPairs();
    const { config, accountId } = configFor(recipient);
    const leaf = await deliveredLeaf(recipient, 0);

    const resolve = coreOwnershipResolver(config, accountId);
    await resolve.prescan?.([leaf]);
    const match = await resolve(leaf);

    expect(match).not.toBeNull();
    const [ex, ey] = recipient.babyJubjubPublicKey.split(".").map(BigInt);
    expect(match?.ownerPub).toEqual([ex, ey]);
    // The recovered shared secret must reproduce the note's ownerHash, exactly as
    // the legacy noteScan path computed it (poseidon over [x, y, sharedSecret]).
    expect(typeof match?.sharedSecret).toBe("bigint");
    expect(match?.sharedSecret).toBeGreaterThan(0n);
  }, 60_000);

  it("does NOT claim a note delivered to a different recipient", async () => {
    const recipient = await core.generateKeyPairs();
    const stranger = await core.generateKeyPairs();
    const { config, accountId } = configFor(stranger); // we scan as the stranger
    const { leaf } = await encryptedLeaf(recipient, 0); // but the note is the recipient's

    const owned = await discoverOwnedNotes([leaf], coreOwnershipResolver(config, accountId));

    // A view tag is only a prefilter and may collide. The note-id integrity gate
    // is what deterministically rejects a false positive.
    expect(owned).toEqual([]);
  }, 60_000);

  it("batches a mixed delta in one scan: claims ours, skips the stranger's", async () => {
    const me = await core.generateKeyPairs();
    const other = await core.generateKeyPairs();
    const { config, accountId } = configFor(me);

    const mine = await encryptedLeaf(me, 0);
    const theirs = await encryptedLeaf(other, 1);

    const owned = await discoverOwnedNotes([mine.leaf, theirs.leaf], coreOwnershipResolver(config, accountId));

    expect(owned.map((note) => note.noteId)).toEqual([mine.note.id.toString()]);
  }, 60_000);

  it("decrypts and integrity-checks an encrypted note produced by the real WASM core", async () => {
    const recipient = await core.generateKeyPairs();
    const { config, accountId } = configFor(recipient);
    const { leaf, note } = await encryptedLeaf(recipient, 0);

    const owned = await discoverOwnedNotes([leaf], coreOwnershipResolver(config, accountId));

    expect(owned).toEqual([
      expect.objectContaining({
        noteId: note.id.toString(),
        amount: note.amount,
        token: note.token,
        sharedSecret: note.owner.sharedSecret,
      }),
    ]);
  }, 60_000);
});

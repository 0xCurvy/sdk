import { beforeAll, describe, expect, it } from "vitest";
import { Core } from "@/core";
import type { SyncedLeaf } from "@/note/notesTreeSync";
import { createFakeConfig, fakeCurvyAccount } from "@/test/fixtures";
import type { CurvyKeyPairs } from "@/types/core";
import { coreOwnershipResolver } from "./seams";

// Real-WASM coverage for the local-ECDH resolver. Unlike seams.test.ts (which
// drives a FAKE core.scanNotes and only proves the format bridge in isolation),
// this exercises the genuine Go WASM scan to prove the END-TO-END wiring: a v3
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

  it("does NOT claim a note delivered to a different recipient (viewTag prefilter rejects)", async () => {
    const recipient = await core.generateKeyPairs();
    const stranger = await core.generateKeyPairs();
    const { config, accountId } = configFor(stranger); // we scan as the stranger
    const leaf = await deliveredLeaf(recipient, 0); // but the note is the recipient's

    const resolve = coreOwnershipResolver(config, accountId);
    await resolve.prescan?.([leaf]);

    expect(await resolve(leaf)).toBeNull();
  }, 60_000);

  it("batches a mixed delta in one scan: claims ours, skips the stranger's", async () => {
    const me = await core.generateKeyPairs();
    const other = await core.generateKeyPairs();
    const { config, accountId } = configFor(me);

    const mine = await deliveredLeaf(me, 0);
    const theirs = await deliveredLeaf(other, 1);

    const resolve = coreOwnershipResolver(config, accountId);
    await resolve.prescan?.([mine, theirs]);

    expect(await resolve(mine)).not.toBeNull();
    expect(await resolve(theirs)).toBeNull();
  }, 60_000);
});

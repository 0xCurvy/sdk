import { describe, expect, it } from "vitest";
import { MapStorage } from "@/storage/map-storage";
import type { GetSyncHotMetaReturnType, SyncHotBlock } from "@/types/api";
import type { NotesCheckpoint } from "@/types/storage";
import { applyHotNotesOverlay } from "./applyHotNotesOverlay";
import { ShardedNotesTree } from "./shardedNotesTree";

const BASE_HASH = `0x${"a".repeat(64)}`;
const HOT_HASH = `0x${"b".repeat(64)}`;

function fixture(noteId: bigint): {
  finalized: ShardedNotesTree;
  checkpoint: NotesCheckpoint;
  meta: GetSyncHotMetaReturnType;
  block: SyncHotBlock;
} {
  const finalized = new ShardedNotesTree({ depth: 8, shardHeight: 3 });
  const effective = ShardedNotesTree.fromSnapshot(finalized.snapshot());
  effective.append(noteId);
  const checkpoint: NotesCheckpoint = {
    networkSlug: "ethereum",
    environment: "testnet",
    leafCount: 0,
    nullifierCount: 0,
    root: finalized.root().toString(),
    blockNumber: 10,
    finalizedBlockNumber: 10,
    finalizedBlockHash: BASE_HASH,
    checkpoint: "checkpoint-10",
    shardHeight: 3,
    lastSynced: 1,
  };
  const meta: GetSyncHotMetaReturnType = {
    snapshot: "snapshot-11",
    baseCheckpoint: "checkpoint-10",
    chainId: 1,
    contractAddress: "0x0000000000000000000000000000000000001234",
    treeVersion: 1,
    finalizedBlockNumber: 10,
    finalizedBlockHash: BASE_HASH,
    finalizedTimestamp: 1_000,
    hotBlockNumber: 11,
    hotBlockHash: HOT_HASH,
    hotTimestamp: 1_012,
    noteCount: 1,
    notesRoot: effective.root().toString(),
    nullifierCount: 0,
    finality: {
      mode: "finalized",
      confirmationDepth: null,
      observedFinalityLagSeconds: 12,
      estimatedSecondsToFinality: null,
      status: "normal",
    },
  };
  const block: SyncHotBlock = {
    number: 11,
    hash: HOT_HASH,
    parentHash: BASE_HASH,
    timestamp: 1_012,
    announcements: [],
    committedNotes: [
      {
        index: 0,
        noteId: noteId.toString(),
        transactionHash: `0x${"c".repeat(64)}`,
        transactionIndex: 0,
        logIndex: 0,
        eventArrayIndex: 0,
        commitTransactionHash: `0x${"d".repeat(64)}`,
        commitTransactionIndex: 0,
        commitLogIndex: 1,
        commitEventArrayIndex: 0,
      },
    ],
    nullifiers: [],
    postBlockNoteCount: 1,
    postBlockNotesRoot: effective.root().toString(),
    postBlockNullifierCount: 0,
  };
  return { finalized, checkpoint, meta, block };
}

describe("applyHotNotesOverlay", () => {
  it("accepts sparse checkpoints across blocks without Curvy events", async () => {
    const storage = new MapStorage();
    const { finalized, checkpoint, meta, block } = fixture(11n);
    block.number = 20;
    block.parentHash = `0x${"9".repeat(64)}`;
    meta.hotBlockNumber = 20;
    meta.hotBlockHash = block.hash;

    const result = await applyHotNotesOverlay({
      storage,
      networkSlug: "ethereum",
      environment: "testnet",
      finalizedTree: finalized,
      finalizedCheckpoint: checkpoint,
      meta,
      blocks: [block],
    });

    expect(result.tree.leafCount).toBe(1);
    expect((await storage.getHotSyncState("ethereum"))?.hotBlockNumber).toBe(20);
  });

  it("replays into a disposable Rust tree without mutating the finalized base", async () => {
    const storage = new MapStorage();
    const { finalized, checkpoint, meta, block } = fixture(11n);
    const baseRoot = finalized.root();

    const result = await applyHotNotesOverlay({
      storage,
      networkSlug: "ethereum",
      environment: "testnet",
      finalizedTree: finalized,
      finalizedCheckpoint: checkpoint,
      meta,
      blocks: [block],
      now: 2_000,
    });

    expect(finalized.leafCount).toBe(0);
    expect(finalized.root()).toBe(baseRoot);
    expect(result.tree.leafCount).toBe(1);
    expect(result.tree.root()).toBe(BigInt(meta.notesRoot));
    expect((await storage.getHotSyncState("ethereum"))?.hotBlockHash).toBe(HOT_HASH);
  });

  it("rejects a discontinuous/tampered projection before replacing the previous overlay", async () => {
    const storage = new MapStorage();
    const first = fixture(11n);
    await applyHotNotesOverlay({
      storage,
      networkSlug: "ethereum",
      environment: "testnet",
      finalizedTree: first.finalized,
      finalizedCheckpoint: first.checkpoint,
      meta: first.meta,
      blocks: [first.block],
    });
    const previous = await storage.getHotSyncState("ethereum");
    const replacement = fixture(22n);
    replacement.block.postBlockNotesRoot = "123";

    await expect(
      applyHotNotesOverlay({
        storage,
        networkSlug: "ethereum",
        environment: "testnet",
        finalizedTree: replacement.finalized,
        finalizedCheckpoint: replacement.checkpoint,
        meta: replacement.meta,
        blocks: [replacement.block],
      }),
    ).rejects.toThrow(/root\/count mismatch/);
    expect(await storage.getHotSyncState("ethereum")).toEqual(previous);
  });
});

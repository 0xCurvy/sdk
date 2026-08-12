import { describe, expect, it, vi } from "vitest";
import { getNotesTreeParameters } from "@/core/rustCore";
import type { SyncCommittedNote, SyncHotBlock } from "@/http/contracts";
import { Note } from "@/note/note";
import type { RootVerifier } from "@/note/notesTreeSync";
import { ShardedNotesTree } from "@/note/shardedNotesTree";
import { MerkleTree } from "@/proving/merkleTree";
import { createFakeApi, createFakeConfig, createFakeCore, fixtureNetwork } from "@/test/fixtures";
import type { ValidNotesRootVerifier } from "./resolveNoteWitness";
import { resolveNoteWitness } from "./resolveNoteWitness";

const NETWORK = fixtureNetwork({
  aggregatorContractAddress: "0x00000000000000000000000000000000000000aa",
});
const CHECKPOINT_HASH = `0x${"f".repeat(64)}`;
const TREE_PARAMETERS = getNotesTreeParameters();

const leaves = (values: bigint[]): SyncCommittedNote[] =>
  values.map((noteId, index) => ({
    index,
    noteId: `0x${noteId.toString(16)}`,
    commitBlockNumber: 100,
    commitBlockHash: CHECKPOINT_HASH,
    commitTxHash: `0x${"c".repeat(64)}`,
  }));

const treeFor = (items: SyncCommittedNote[]): MerkleTree =>
  MerkleTree.fromLeaves(
    { depth: TREE_PARAMETERS.depth },
    items.map((leaf) => BigInt(leaf.noteId)),
  );

function checkpointFor(items: SyncCommittedNote[], checkpoint: string) {
  return {
    checkpoint,
    chainId: 1,
    contractAddress: NETWORK.aggregatorContractAddress as string,
    treeVersion: TREE_PARAMETERS.version,
    finalizedBlockNumber: 100,
    finalizedBlockHash: CHECKPOINT_HASH,
    notesRoot: treeFor(items).root().toString(),
    noteCount: items.length,
    nullifierCount: 0,
    pendingCount: 0,
    shardCount: 0,
    shardHeight: TREE_PARAMETERS.shardHeight,
    shardSize: TREE_PARAMETERS.shardSize,
  };
}

function verifierFor(items: SyncCommittedNote[]): RootVerifier {
  const tree = treeFor(items);
  return {
    async currentRoot(checkpoint) {
      if (checkpoint)
        return {
          root: BigInt(checkpoint.notesRoot),
          noteIndex: checkpoint.noteCount,
        };
      return { root: tree.root(), noteIndex: items.length };
    },
  };
}

const validRootVerifier: ValidNotesRootVerifier = {
  async isValidRoot() {
    return true;
  },
};

describe("resolveNoteWitness", () => {
  it("scans fixed sequential pages from genesis and returns a chain-anchored witness", async () => {
    const items = leaves([11n, 22n, 33n, 44n, 55n]);
    const checkpoint = checkpointFor(items, "checkpoint-1");
    const GetNotes = vi.fn(async (_chainId: number, fromIndex: number, limit = 500) => {
      const notes = items.slice(fromIndex, fromIndex + limit);
      return {
        checkpoint: checkpoint.checkpoint,
        fromIndex,
        notes,
        nextIndex: fromIndex + notes.length,
        total: items.length,
      };
    });
    const GetNullifiers = vi.fn();
    const config = createFakeConfig({
      api: createFakeApi({
        sync: {
          GetMeta: vi.fn(async () => checkpoint),
          GetNotes,
          GetNullifiers,
        },
      }),
      networks: [NETWORK],
    });

    const supplied = await resolveNoteWitness({
      config,
      networkSlug: NETWORK.slug,
      scanFrom: 0,
      noteId: 33n,
      pageSize: 2,
      timeoutMs: 0,
      verifier: verifierFor(items),
      validRootVerifier,
    });

    expect(GetNotes.mock.calls.map((call) => call.slice(1, 3))).toEqual([
      [0, 2],
      [2, 2],
      [4, 2],
    ]);
    expect(GetNullifiers).not.toHaveBeenCalled();
    expect(supplied?.proofs[0]).toMatchObject({
      leaf: 33n,
      index: 2,
      root: treeFor(items).root(),
    });
    if (!supplied) throw new Error("expected a resolved witness");
    expect(treeFor(items).verifyProof(supplied.proofs[0])).toBe(true);
  });

  it("keeps its local cursor while polling for a later commitment", async () => {
    const before = leaves([11n, 22n]);
    const after = leaves([11n, 22n, 33n]);
    let head = before;
    let checkpoint = checkpointFor(head, "checkpoint-1");
    const GetMeta = vi.fn(async () => {
      const current = checkpoint;
      head = after;
      checkpoint = checkpointFor(head, "checkpoint-2");
      return current;
    });
    const GetNotes = vi.fn(async (_chainId: number, fromIndex: number, limit = 500, at?: string) => {
      if (!at) throw new Error("expected a pinned checkpoint");
      const snapshot = at === "checkpoint-1" ? before : after;
      const notes = snapshot.slice(fromIndex, fromIndex + limit);
      return {
        checkpoint: at,
        fromIndex,
        notes,
        nextIndex: fromIndex + notes.length,
        total: snapshot.length,
      };
    });
    const config = createFakeConfig({
      api: createFakeApi({ sync: { GetMeta, GetNotes } }),
      networks: [NETWORK],
    });

    const supplied = await resolveNoteWitness({
      config,
      networkSlug: NETWORK.slug,
      scanFrom: 0,
      noteId: 33n,
      pageSize: 10,
      pollIntervalMs: 1,
      timeoutMs: 100,
      verifier: verifierFor(after),
      validRootVerifier,
    });

    expect(GetNotes.mock.calls.map((call) => call[1])).toEqual([0, 2]);
    expect(supplied?.proofs[0]).toMatchObject({ leaf: 33n, index: 2 });
  });

  it("discovers owned notes locally and delegates exact-note selection to the caller", async () => {
    const spendingKey = "11".repeat(32);
    const viewingKey = "22".repeat(32);
    const note = new Note({
      amount: 10_000n,
      token: 7n,
      owner: { babyJubjubPublicKey: { x: 1n, y: 2n }, sharedSecret: 99n },
      ephemeralKey: [3n, 4n],
      viewTag: 5n,
    });
    const items: SyncCommittedNote[] = [
      ...leaves([11n]),
      {
        index: 1,
        noteId: `0x${note.id.toString(16)}`,
        ephemeralKey: ["0x3", "0x4"],
        viewTag: 5,
        amount: "10000",
        token: "7",
        isPlaintext: true,
        commitBlockNumber: 100,
        commitBlockHash: CHECKPOINT_HASH,
        commitTxHash: `0x${"c".repeat(64)}`,
      },
    ];
    const checkpoint = checkpointFor(items, "checkpoint-owned-note");
    const scanNotes = vi.fn(async () => ({
      spendingPubKeys: ["99.0"],
      spendingPrivKeys: [],
    }));
    const config = createFakeConfig({
      core: createFakeCore({
        getBabyJubjubPublicKey: vi.fn(async () => "1.2"),
        scanNotes,
      }),
      api: createFakeApi({
        sync: {
          GetMeta: vi.fn(async () => checkpoint),
          GetNotes: vi.fn(async (_chainId: number, fromIndex: number) => ({
            checkpoint: checkpoint.checkpoint,
            fromIndex,
            notes: items.slice(fromIndex),
            nextIndex: items.length,
            total: items.length,
          })),
        },
      }),
      networks: [NETWORK],
    });
    const matchOwnedNote = vi.fn((candidate) => candidate.noteId === note.id.toString());

    const resolved = await resolveNoteWitness({
      config,
      networkSlug: NETWORK.slug,
      scanFrom: 1,
      spendingKey,
      viewingKey,
      matchOwnedNote,
      timeoutMs: 0,
      verifier: verifierFor(items),
      validRootVerifier,
    });

    expect(scanNotes).toHaveBeenCalledWith(spendingKey, viewingKey, [{ ephemeralKey: "3.4", viewTag: "05" }]);
    expect(matchOwnedNote).toHaveBeenCalledWith(expect.objectContaining({ noteId: note.id.toString() }));
    expect(resolved?.ownedNote).toMatchObject({
      noteId: note.id.toString(),
      leafIndex: 1,
      amount: 10_000n,
      token: 7n,
      sharedSecret: 99n,
    });
    expect(resolved?.proofs[0]).toMatchObject({ leaf: note.id, index: 1 });
  });

  it("resolves a committed gift from the verified hot suffix without waiting for finality", async () => {
    const spendingKey = "11".repeat(32);
    const viewingKey = "22".repeat(32);
    const note = new Note({
      amount: 10_000n,
      token: 7n,
      owner: { babyJubjubPublicKey: { x: 1n, y: 2n }, sharedSecret: 99n },
      ephemeralKey: [3n, 4n],
      viewTag: 5n,
    });
    const finalizedItems = leaves([11n]);
    const targetItem: SyncCommittedNote = {
      index: 1,
      noteId: note.id.toString(),
      commitBlockNumber: 101,
      commitBlockHash: `0x${"b".repeat(64)}`,
      commitTxHash: `0x${"d".repeat(64)}`,
    };
    const laterItem: SyncCommittedNote = {
      index: 2,
      noteId: "44",
      commitBlockNumber: 101,
      commitBlockHash: `0x${"b".repeat(64)}`,
      commitTxHash: `0x${"e".repeat(64)}`,
    };
    const hotItems = [...finalizedItems, targetItem, laterItem];
    const historicalItems = hotItems.slice(0, 2);
    const checkpoint = checkpointFor(finalizedItems, "checkpoint-hot-base");
    const hotBlockHash = `0x${"b".repeat(64)}`;
    const hotBlock: SyncHotBlock = {
      number: 101,
      hash: hotBlockHash,
      parentHash: CHECKPOINT_HASH,
      timestamp: 1_012,
      announcements: [],
      committedNotes: [
        {
          index: 1,
          noteId: note.id.toString(),
          ephemeralKey: ["3", "4"],
          viewTag: 5,
          amount: "10000",
          token: "7",
          isPlaintext: true,
          transactionHash: `0x${"a".repeat(64)}`,
          transactionIndex: 0,
          logIndex: 0,
          eventArrayIndex: 0,
          commitTransactionHash: targetItem.commitTxHash as string,
          commitTransactionIndex: 1,
          commitLogIndex: 0,
          commitEventArrayIndex: 0,
        },
        {
          index: 2,
          noteId: laterItem.noteId,
          transactionHash: `0x${"9".repeat(64)}`,
          transactionIndex: 2,
          logIndex: 0,
          eventArrayIndex: 0,
          commitTransactionHash: laterItem.commitTxHash as string,
          commitTransactionIndex: 2,
          commitLogIndex: 0,
          commitEventArrayIndex: 0,
        },
      ],
      nullifiers: [],
      postBlockNoteCount: hotItems.length,
      postBlockNotesRoot: treeFor(hotItems).root().toString(),
      postBlockNullifierCount: 0,
    };
    const meta = {
      snapshot: "snapshot-hot-101",
      baseCheckpoint: checkpoint.checkpoint,
      chainId: 1,
      contractAddress: NETWORK.aggregatorContractAddress as string,
      treeVersion: TREE_PARAMETERS.version,
      finalizedBlockNumber: 100,
      finalizedBlockHash: CHECKPOINT_HASH,
      finalizedTimestamp: 1_000,
      hotBlockNumber: 101,
      hotBlockHash,
      hotTimestamp: 1_012,
      noteCount: hotItems.length,
      notesRoot: treeFor(hotItems).root().toString(),
      nullifierCount: 0,
      finality: {
        mode: "finalized" as const,
        confirmationDepth: null,
        observedFinalityLagSeconds: 12,
        estimatedSecondsToFinality: null,
        status: "normal" as const,
      },
    };
    const scanNotes = vi.fn(async () => ({ spendingPubKeys: ["99.0"], spendingPrivKeys: [] }));
    const GetHotBlocks = vi.fn(async () => ({
      snapshot: meta.snapshot,
      fromBlock: 101,
      nextBlock: 102,
      hotBlockNumber: 101,
      done: true,
      blocks: [hotBlock],
    }));
    const config = createFakeConfig({
      core: createFakeCore({
        getBabyJubjubPublicKey: vi.fn(async () => "1.2"),
        scanNotes,
      }),
      api: createFakeApi({
        sync: {
          GetMeta: vi.fn(async () => checkpoint),
          GetNotes: vi.fn(async (_chainId: number, fromIndex: number) => ({
            checkpoint: checkpoint.checkpoint,
            fromIndex,
            notes: finalizedItems.slice(fromIndex),
            nextIndex: finalizedItems.length,
            total: finalizedItems.length,
          })),
          GetHotMeta: vi.fn(async () => meta),
          GetHotBlocks,
        },
      }),
      networks: [NETWORK],
    });
    const verifier: RootVerifier = {
      async currentRoot(at) {
        if (at?.checkpoint === meta.snapshot) {
          return { root: treeFor(hotItems).root(), noteIndex: hotItems.length };
        }
        return { root: treeFor(finalizedItems).root(), noteIndex: finalizedItems.length };
      },
    };
    const isValidRoot = vi.fn(async (root: bigint) => root === treeFor(historicalItems).root());

    const resolved = await resolveNoteWitness({
      config,
      networkSlug: NETWORK.slug,
      scanFrom: 1,
      spendingKey,
      viewingKey,
      matchOwnedNote: (candidate) => candidate.noteId === note.id.toString(),
      timeoutMs: 0,
      verifier,
      validRootVerifier: { isValidRoot },
    });

    expect(GetHotBlocks).toHaveBeenCalledWith(1, meta.snapshot, 101, 64);
    expect(scanNotes).toHaveBeenCalledWith(spendingKey, viewingKey, [{ ephemeralKey: "3.4", viewTag: "05" }]);
    expect(resolved?.ownedNote).toMatchObject({ noteId: note.id.toString(), leafIndex: 1, amount: 10_000n });
    expect(resolved?.proofs[0]).toMatchObject({
      leaf: note.id,
      index: 1,
      root: treeFor(historicalItems).root(),
    });
    expect(isValidRoot).toHaveBeenCalledWith(treeFor(historicalItems).root());
  });

  it("stops after the matching commitment batch and anchors its historical root", async () => {
    const items = leaves([11n, 22n, 33n]);
    const nextBatch = items[2];
    if (!nextBatch) throw new Error("expected the third fixture leaf");
    nextBatch.commitTxHash = `0x${"d".repeat(64)}`;
    const checkpoint = checkpointFor(items, "checkpoint-two-batches");
    const historicalItems = items.slice(0, 2);
    const isValidRoot = vi.fn(async (root: bigint) => root === treeFor(historicalItems).root());
    const config = createFakeConfig({
      api: createFakeApi({
        sync: {
          GetMeta: vi.fn(async () => checkpoint),
          GetNotes: vi.fn(async (_chainId: number, fromIndex: number) => ({
            checkpoint: checkpoint.checkpoint,
            fromIndex,
            notes: items.slice(fromIndex),
            nextIndex: items.length,
            total: items.length,
          })),
        },
      }),
      networks: [NETWORK],
    });

    const resolved = await resolveNoteWitness({
      config,
      networkSlug: NETWORK.slug,
      scanFrom: 0,
      noteId: 22n,
      timeoutMs: 0,
      verifier: verifierFor(items),
      validRootVerifier: { isValidRoot },
    });

    expect(resolved?.proofs[0]).toMatchObject({
      root: treeFor(historicalItems).root(),
      index: 1,
    });
    expect(isValidRoot).toHaveBeenCalledWith(treeFor(historicalItems).root());
  });

  it("bootstraps completed shard roots and downloads leaves only from the hinted shard", async () => {
    const shardSize = TREE_PARAMETERS.shardSize;
    const prefix = Array.from({ length: shardSize }, (_, index) => BigInt(index + 1));
    const sourceTree = new ShardedNotesTree();
    sourceTree.appendMany(prefix);
    const prefixRoot = sourceTree.shardRootAt(0);
    const target = 999_999n;
    sourceTree.append(target);
    const targetRecord: SyncCommittedNote = {
      index: shardSize,
      noteId: target.toString(),
      commitBlockNumber: 100,
      commitBlockHash: CHECKPOINT_HASH,
      commitTxHash: `0x${"e".repeat(64)}`,
    };
    const checkpoint = {
      ...checkpointFor([], "checkpoint-shard-hint"),
      notesRoot: sourceTree.root().toString(),
      noteCount: shardSize + 1,
      shardCount: 1,
    };
    const GetShardRoots = vi.fn(async () => ({
      checkpoint: checkpoint.checkpoint,
      fromIndex: 0,
      shardRoots: [prefixRoot.toString()],
      nextIndex: 1,
      total: 1,
      shardHeight: TREE_PARAMETERS.shardHeight,
      shardSize,
    }));
    const GetNotes = vi.fn(async (_chainId: number, fromIndex: number) => ({
      checkpoint: checkpoint.checkpoint,
      fromIndex,
      notes: [targetRecord],
      nextIndex: shardSize + 1,
      total: shardSize + 1,
    }));
    const config = createFakeConfig({
      api: createFakeApi({
        sync: {
          GetMeta: vi.fn(async () => checkpoint),
          GetShardRoots,
          GetNotes,
        },
      }),
      networks: [NETWORK],
    });

    const resolved = await resolveNoteWitness({
      config,
      networkSlug: NETWORK.slug,
      scanFrom: shardSize,
      noteId: target,
      timeoutMs: 0,
      verifier: {
        async currentRoot() {
          return { root: sourceTree.root(), noteIndex: shardSize + 1 };
        },
      },
      validRootVerifier,
    });

    expect(GetShardRoots).toHaveBeenCalledWith(1, 0, 1, checkpoint.checkpoint);
    expect(GetNotes).toHaveBeenCalledWith(1, shardSize, 500, checkpoint.checkpoint);
    expect(resolved?.proofs[0]).toMatchObject({
      leaf: target,
      index: shardSize,
      root: sourceTree.root(),
    });
  });

  it("returns null after one complete scan when the deadline has elapsed", async () => {
    const items = leaves([11n, 22n]);
    const checkpoint = checkpointFor(items, "checkpoint-1");
    const config = createFakeConfig({
      api: createFakeApi({
        sync: {
          GetMeta: vi.fn(async () => checkpoint),
          GetNotes: vi.fn(async (_chainId: number, fromIndex: number) => ({
            checkpoint: checkpoint.checkpoint,
            fromIndex,
            notes: items.slice(fromIndex),
            nextIndex: items.length,
            total: items.length,
          })),
        },
      }),
      networks: [NETWORK],
    });

    await expect(
      resolveNoteWitness({
        config,
        networkSlug: NETWORK.slug,
        scanFrom: 0,
        noteId: 99n,
        timeoutMs: 0,
        verifier: verifierFor(items),
      }),
    ).resolves.toBeNull();
  });

  it("rejects an indexer tree that omits the target and does not match the direct-chain root", async () => {
    const items = leaves([11n, 22n, 33n]);
    const checkpoint = checkpointFor(items, "checkpoint-1");
    const config = createFakeConfig({
      api: createFakeApi({
        sync: {
          GetMeta: vi.fn(async () => checkpoint),
          GetNotes: vi.fn(async (_chainId: number, fromIndex: number) => ({
            checkpoint: checkpoint.checkpoint,
            fromIndex,
            notes: items.slice(fromIndex),
            nextIndex: items.length,
            total: items.length,
          })),
        },
      }),
      networks: [NETWORK],
    });
    const badVerifier: RootVerifier = {
      async currentRoot() {
        return { root: 999n, noteIndex: items.length };
      },
    };

    await expect(
      resolveNoteWitness({
        config,
        networkSlug: NETWORK.slug,
        scanFrom: 0,
        noteId: 99n,
        timeoutMs: 0,
        verifier: badVerifier,
      }),
    ).rejects.toThrow(/checkpoint root .* on-chain root 999/);
  });
});

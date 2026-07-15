import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { StorageInterface } from "@/interfaces/storage";
import { Note } from "@/note/note";
import { noteToBalanceEntry } from "@/note/noteToBalanceEntry";
import { nullifier as rustNullifier } from "@/proving/rustCore";
import type { GetSyncHotMetaReturnType, SyncHotBlock } from "@/types/api";
import type { HexString } from "@/types/helper";
import type {
  HotBlockRecord,
  HotNoteState,
  NotesCheckpoint,
  TransferHistoryRecord,
  TxHistoryEntry,
} from "@/types/storage";
import { discoverOwnedNotes, type OwnedNote, type OwnershipResolver } from "./discoverOwnedNotes";
import type { SyncedLeaf } from "./notesTreeSync";
import { ShardedNotesTree } from "./shardedNotesTree";

type ApplyHotNotesOverlayOptions = {
  storage: StorageInterface;
  accountId?: string;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  finalizedTree: ShardedNotesTree;
  finalizedCheckpoint: NotesCheckpoint;
  meta: GetSyncHotMetaReturnType;
  blocks: SyncHotBlock[];
  resolveOwnership?: OwnershipResolver;
  now?: number;
};

type ApplyHotNotesOverlayResult = {
  tree: ShardedNotesTree;
  noteStates: HotNoteState[];
  generation: number;
};

const decimal = (value: string): string => BigInt(value).toString();

function candidateLeaf(block: SyncHotBlock, note: SyncHotBlock["committedNotes"][number]): SyncedLeaf {
  return {
    index: note.index,
    noteId: decimal(note.noteId),
    ephemeralKey: note.ephemeralKey?.map(decimal) as [string, string] | undefined,
    viewTag: note.viewTag,
    amount: note.amount,
    token: note.token,
    isPlaintext: note.isPlaintext,
    blockNumber: note.announcementBlockNumber ?? block.number,
    requestTxHash: note.transactionHash,
  };
}

/** Rebuild a disposable Rust-backed effective tree from one pinned hot suffix. */
export async function applyHotNotesOverlay(options: ApplyHotNotesOverlayOptions): Promise<ApplyHotNotesOverlayResult> {
  const { storage, accountId, networkSlug, environment, finalizedCheckpoint, meta } = options;
  if (meta.baseCheckpoint !== finalizedCheckpoint.checkpoint) {
    throw new Error(
      `hot overlay base ${meta.baseCheckpoint} does not match finalized ${finalizedCheckpoint.checkpoint}`,
    );
  }
  if (options.finalizedTree.leafCount !== finalizedCheckpoint.leafCount) {
    throw new Error("hot overlay finalized tree count does not match its checkpoint");
  }
  if (options.finalizedTree.root() !== BigInt(finalizedCheckpoint.root)) {
    throw new Error("hot overlay finalized tree root does not match its checkpoint");
  }
  if (finalizedCheckpoint.finalizedBlockNumber === undefined || !finalizedCheckpoint.finalizedBlockHash) {
    throw new Error("hot overlay requires finalized block identity");
  }
  if (
    meta.finalizedBlockNumber !== finalizedCheckpoint.finalizedBlockNumber ||
    meta.finalizedBlockHash !== finalizedCheckpoint.finalizedBlockHash
  ) {
    throw new Error("hot overlay base block does not match its finalized checkpoint");
  }
  let parentHash = finalizedCheckpoint.finalizedBlockHash;
  let expectedBlock = finalizedCheckpoint.finalizedBlockNumber + 1;
  for (const block of options.blocks) {
    if (block.number !== expectedBlock || block.parentHash !== parentHash) {
      throw new Error(`hot overlay discontinuity at ${block.number}/${block.hash}`);
    }
    expectedBlock += 1;
    parentHash = block.hash;
  }
  if (expectedBlock !== meta.hotBlockNumber + 1 || parentHash !== meta.hotBlockHash) {
    throw new Error("hot overlay did not end at the pinned head");
  }

  const tree = ShardedNotesTree.fromSnapshot(options.finalizedTree.snapshot());
  const committedCandidates = options.blocks.flatMap((block) =>
    block.committedNotes.map((note) => candidateLeaf(block, note)),
  );
  const committedIds = new Set(committedCandidates.map((leaf) => leaf.noteId));
  const pendingCandidates: SyncedLeaf[] = options.blocks.flatMap((block) =>
    block.announcements
      .filter((note) => !committedIds.has(decimal(note.noteId)))
      .map((note) => ({
        index: -1,
        noteId: decimal(note.noteId),
        ephemeralKey: note.ephemeralKey?.map(decimal) as [string, string] | undefined,
        viewTag: note.viewTag,
        amount: note.amount,
        token: note.token,
        isPlaintext: note.isPlaintext,
        blockNumber: block.number,
        requestTxHash: note.transactionHash,
      })),
  );
  const owned = options.resolveOwnership
    ? await discoverOwnedNotes([...committedCandidates, ...pendingCandidates], options.resolveOwnership)
    : [];
  const ownedById = new Map(owned.map((note) => [note.noteId, note]));
  const plaintextById = new Map(
    [...committedCandidates, ...pendingCandidates].map((leaf) => [leaf.noteId, leaf.isPlaintext === true]),
  );
  const intents = accountId ? await storage.getTransferIntents(accountId, networkSlug) : [];
  const localOrigin = new Map<string, TransferHistoryRecord>();
  for (const intent of intents) {
    for (const noteId of intent.expectedOutputCommitments) localOrigin.set(noteId, intent);
  }

  const noteStates = new Map<string, HotNoteState>();
  const balanceById = new Map<string, Awaited<ReturnType<StorageInterface["getBalances"]>>[number]>();
  if (accountId) {
    for (const entry of await storage.getBalances(accountId, environment)) {
      if (entry.networkSlug === networkSlug) balanceById.set(entry.id, entry);
    }
  }
  const ownedNullifiers = new Map<bigint, string>();
  for (const entry of balanceById.values()) {
    ownedNullifiers.set(
      rustNullifier(
        BigInt(entry.owner.sharedSecret),
        BigInt(entry.owner.babyJubjubPublicKey.x),
        BigInt(entry.owner.babyJubjubPublicKey.y),
      ),
      entry.id,
    );
  }
  for (const note of owned) {
    ownedNullifiers.set(rustNullifier(note.sharedSecret, note.ownerPub[0], note.ownerPub[1]), note.noteId);
  }
  let nullifierCount = finalizedCheckpoint.nullifierCount;

  const toBalance = async (note: OwnedNote, finality: "hot" | "finalized") => {
    if (!accountId) return undefined;
    let metadata: Awaited<ReturnType<StorageInterface["getCurrencyMetadata"]>>;
    try {
      metadata = await storage.getCurrencyMetadata(note.token, networkSlug);
    } catch {
      return undefined;
    }
    const value = new Note({
      amount: note.amount,
      token: note.token,
      owner: {
        babyJubjubPublicKey: { x: note.ownerPub[0], y: note.ownerPub[1] },
        sharedSecret: note.sharedSecret,
      },
      ephemeralKey: note.ephemeralKey,
      viewTag: BigInt(note.viewTag),
    });
    return {
      ...noteToBalanceEntry(value, {
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        accountId,
        environment,
        networkSlug,
        currencyAddress: metadata.address as HexString,
      }),
      leafIndex: note.leafIndex >= 0 ? note.leafIndex : null,
      finality,
    };
  };

  for (const block of options.blocks) {
    for (const announcement of block.announcements) {
      const noteId = decimal(announcement.noteId);
      const note = ownedById.get(noteId);
      if (!accountId || !note || committedIds.has(noteId)) continue;
      const origin = localOrigin.get(noteId);
      noteStates.set(noteId, {
        accountId,
        networkSlug,
        noteId,
        status: "pending_incoming",
        balanceEntry: await toBalance(note, "hot"),
        origin: origin ? "local_intent" : "external",
        originIntentId: origin?.intentId,
        announcementBlockNumber: block.number,
        announcementBlockHash: block.hash,
        requestTxHash: announcement.transactionHash,
      });
    }

    for (const committed of block.committedNotes) {
      const noteId = decimal(committed.noteId);
      if (committed.index !== tree.leafCount) {
        throw new Error(`hot overlay leaf gap: expected ${tree.leafCount}, got ${committed.index}`);
      }
      const note = ownedById.get(noteId);
      if (note && !tree.hasWitness(BigInt(noteId))) tree.mark(BigInt(noteId), committed.index);
      tree.append(BigInt(noteId));
      if (accountId && note) {
        const origin = localOrigin.get(noteId);
        const balanceEntry = await toBalance({ ...note, leafIndex: committed.index }, "hot");
        if (balanceEntry) {
          balanceEntry.commitBlockNumber = block.number;
          balanceEntry.commitBlockHash = block.hash;
          balanceEntry.originIntentId = origin?.intentId;
        }
        noteStates.set(noteId, {
          accountId,
          networkSlug,
          noteId,
          status: "hot_available",
          balanceEntry,
          origin: origin ? "local_intent" : "external",
          originIntentId: origin?.intentId,
          announcementBlockNumber: committed.announcementBlockNumber,
          announcementBlockHash: committed.announcementBlockHash,
          requestTxHash: committed.transactionHash,
          commitmentBlockNumber: block.number,
          commitmentBlockHash: block.hash,
          commitTxHash: committed.commitTransactionHash,
          leafIndex: committed.index,
        });
      }
    }

    for (const nullifier of block.nullifiers) {
      if (nullifier.index !== nullifierCount) {
        throw new Error(`hot overlay nullifier gap: expected ${nullifierCount}, got ${nullifier.index}`);
      }
      nullifierCount += 1;
      const noteId = ownedNullifiers.get(BigInt(nullifier.nullifier));
      if (!accountId || !noteId) continue;
      const provisional = noteStates.get(noteId);
      if (tree.hasWitness(BigInt(noteId))) tree.unmark(BigInt(noteId));
      noteStates.set(noteId, {
        accountId,
        networkSlug,
        noteId,
        status: provisional ? "hot_spent" : "finalized_spent_hot",
        balanceEntry: provisional?.balanceEntry ?? balanceById.get(noteId),
        origin: provisional?.origin ?? "external",
        originIntentId: provisional?.originIntentId,
        spentHotBy: nullifier.relaySubmissionId ?? nullifier.transactionHash,
        spentBlockNumber: block.number,
        spentBlockHash: block.hash,
        spendTxHash: nullifier.transactionHash,
        commitmentBlockNumber: provisional?.commitmentBlockNumber,
        commitmentBlockHash: provisional?.commitmentBlockHash,
        commitTxHash: provisional?.commitTxHash,
        leafIndex: provisional?.leafIndex ?? balanceById.get(noteId)?.leafIndex ?? undefined,
      });
    }
    if (nullifierCount !== block.postBlockNullifierCount) throw new Error("hot overlay nullifier count mismatch");
    if (tree.leafCount !== block.postBlockNoteCount || tree.root() !== BigInt(block.postBlockNotesRoot)) {
      throw new Error(`hot overlay post-block root/count mismatch at ${block.number}/${block.hash}`);
    }
  }

  if (tree.leafCount !== meta.noteCount || tree.root() !== BigInt(meta.notesRoot)) {
    throw new Error("hot overlay final root/count does not match its pinned snapshot");
  }
  if (nullifierCount !== meta.nullifierCount) {
    throw new Error("hot overlay final nullifier count does not match its pinned snapshot");
  }
  const previous = await storage.getHotSyncState(networkSlug);
  const generation = (previous?.generation ?? 0) + 1;
  const records: HotBlockRecord[] = options.blocks.map((block) => ({ networkSlug, ...block }));
  const history: TxHistoryEntry[] = [];
  for (const note of noteStates.values()) {
    if (!note.balanceEntry) continue;
    if (note.status === "hot_available" || note.status === "hot_spent") {
      history.push({
        id: `${networkSlug}:${note.noteId}:receive`,
        accountId: note.accountId,
        networkSlug,
        environment,
        kind: "receive",
        origin: plaintextById.get(note.noteId) ? "deposit" : "transfer",
        noteId: note.noteId,
        amount: note.balanceEntry.balance.toString(),
        token: note.balanceEntry.vaultTokenId?.toString() ?? "0",
        leafIndex: note.leafIndex,
        requestTxHash: note.requestTxHash,
        blockNumber: note.commitmentBlockNumber,
        blockHash: note.commitmentBlockHash,
        commitTxHash: note.commitTxHash,
        finality: "hot",
        status: "available_hot",
        observedAt: options.now ?? Date.now(),
      });
    }
    if (note.status === "hot_spent" || note.status === "finalized_spent_hot") {
      history.push({
        id: `${networkSlug}:${note.noteId}:spend`,
        accountId: note.accountId,
        networkSlug,
        environment,
        kind: "spend",
        noteId: note.noteId,
        amount: note.balanceEntry.balance.toString(),
        token: note.balanceEntry.vaultTokenId?.toString() ?? "0",
        leafIndex: note.leafIndex,
        requestTxHash: note.spendTxHash,
        blockNumber: note.spentBlockNumber,
        blockHash: note.spentBlockHash,
        finality: "hot",
        status: "available_hot",
        observedAt: options.now ?? Date.now(),
      });
    }
  }
  await storage.replaceHotOverlay({
    state: {
      networkSlug,
      environment,
      generation,
      baseCheckpoint: meta.baseCheckpoint,
      baseBlockNumber: meta.finalizedBlockNumber,
      baseBlockHash: meta.finalizedBlockHash,
      snapshot: meta.snapshot,
      hotBlockNumber: meta.hotBlockNumber,
      hotBlockHash: meta.hotBlockHash,
      noteCount: meta.noteCount,
      notesRoot: decimal(meta.notesRoot),
      nullifierCount: meta.nullifierCount,
      finalityMode: meta.finality.mode,
      finalityStatus: meta.finality.status,
      observedFinalityLagSeconds: meta.finality.observedFinalityLagSeconds,
      estimatedSecondsToFinality: meta.finality.estimatedSecondsToFinality,
      updatedAt: options.now ?? Date.now(),
    },
    blocks: records,
    accountId,
    noteStates: [...noteStates.values()],
    history,
  });
  return { tree, noteStates: [...noteStates.values()], generation };
}

import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { IApiClient } from "@/interfaces/api";
import type { StorageInterface } from "@/interfaces/storage";
import type { GetSyncHotBlocksReturnType, GetSyncHotMetaReturnType, SyncHotBlock } from "@/types/api";
import type { NotesCheckpoint } from "@/types/storage";
import { applyHotNotesOverlay } from "./applyHotNotesOverlay";
import type { OwnershipResolver } from "./discoverOwnedNotes";
import type { RootVerifier } from "./notesTreeSync";
import type { ShardedNotesTree } from "./shardedNotesTree";

type SyncHotNotesOverlayOptions = {
  api: IApiClient;
  storage: StorageInterface;
  chainId: number;
  accountId?: string;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  finalizedTree: ShardedNotesTree;
  finalizedCheckpoint: NotesCheckpoint;
  verifier: RootVerifier;
  resolveOwnership?: OwnershipResolver;
  pageSize?: number;
  signal?: AbortSignal;
};

type SyncHotNotesOverlayResult = {
  tree: ShardedNotesTree;
  meta: GetSyncHotMetaReturnType;
  blocks: SyncHotBlock[];
};

/** Fetch, verify, replay, and atomically persist one checkpoint-pinned hot suffix. */
export async function syncHotNotesOverlay(options: SyncHotNotesOverlayOptions): Promise<SyncHotNotesOverlayResult> {
  const checkpoint = options.finalizedCheckpoint.checkpoint;
  if (!checkpoint || options.finalizedCheckpoint.finalizedBlockNumber === undefined) {
    throw new Error("hot sync requires a verified finalized checkpoint");
  }
  const meta = await options.api.sync.GetHotMeta(options.chainId, checkpoint);
  if (meta.finality.status === "provider_disagreement" || meta.finality.status === "deep_reorg") {
    throw new Error(`hot sync disabled while indexer status is ${meta.finality.status}`);
  }

  const blocks: SyncHotBlock[] = [];
  let fromBlock = meta.finalizedBlockNumber + 1;
  while (fromBlock <= meta.hotBlockNumber) {
    options.signal?.throwIfAborted();
    const page: GetSyncHotBlocksReturnType = await options.api.sync.GetHotBlocks(
      options.chainId,
      meta.snapshot,
      fromBlock,
      options.pageSize ?? 64,
    );
    if (
      page.snapshot !== meta.snapshot ||
      page.fromBlock !== fromBlock ||
      page.hotBlockNumber !== meta.hotBlockNumber
    ) {
      throw new Error("hot sync page changed its pinned snapshot");
    }
    if (page.blocks.length === 0 || page.nextBlock !== fromBlock + page.blocks.length) {
      throw new Error("hot sync page was incomplete");
    }
    blocks.push(...page.blocks);
    fromBlock = page.nextBlock;
  }

  const chain = await options.verifier.currentRoot({
    checkpoint: meta.snapshot,
    chainId: meta.chainId,
    contractAddress: meta.contractAddress,
    treeVersion: meta.treeVersion,
    finalizedBlockNumber: meta.hotBlockNumber,
    finalizedBlockHash: meta.hotBlockHash,
    notesRoot: meta.notesRoot,
    noteCount: meta.noteCount,
    nullifierCount: meta.nullifierCount,
    shardHeight: options.finalizedCheckpoint.shardHeight ?? options.finalizedTree.shardHeight,
    shardSize: options.finalizedTree.shardSize,
    shardCount: Math.floor(meta.noteCount / options.finalizedTree.shardSize),
  });
  if (chain.noteIndex !== meta.noteCount || chain.root !== BigInt(meta.notesRoot)) {
    throw new Error("hot sync head does not match direct chain RPC");
  }

  const result = await applyHotNotesOverlay({
    storage: options.storage,
    accountId: options.accountId,
    networkSlug: options.networkSlug,
    environment: options.environment,
    finalizedTree: options.finalizedTree,
    finalizedCheckpoint: options.finalizedCheckpoint,
    meta,
    blocks,
    resolveOwnership: options.resolveOwnership,
  });
  return { tree: result.tree, meta, blocks };
}

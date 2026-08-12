import { resolveConfig } from "@/config/global";
import type { CurvyConfig, WithConfig } from "@/config/types";
import { getNotesTreeParameters } from "@/core/rustCore";
import type { GetSyncHotBlocksReturnType, GetSyncHotMetaReturnType, SyncHotBlock } from "@/http/contracts";
import type { OwnedNote, OwnershipMatch, OwnershipResolver } from "@/note/discoverOwnedNotes";
import { discoverOwnedNotes } from "@/note/discoverOwnedNotes";
import type { FinalizedSyncCheckpoint, RootVerifier, SyncedLeaf } from "@/note/notesTreeSync";
import { reconcileWithChain } from "@/note/notesTreeSync";
import { ShardedNotesTree } from "@/note/shardedNotesTree";
import type { SuppliedInclusionProofs } from "@/proving/witnessFromNotes";
import type { EvmRpc } from "@/rpc";
import { rpcRootVerifier } from "./internal/seams";

const DEFAULT_PAGE_SIZE = 500;
const HOT_BLOCK_PAGE_SIZE = 64;
const DEFAULT_TIMEOUT_MS = 240_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const PRIVATE_KEY_PATTERN = /^(?:[0-9a-fA-F]{2}){1,32}$/;

type ResolveNoteWitnessBase = {
  networkSlug: string;
  /** Public lower-bound hint. Discovery never considers leaves below it. */
  scanFrom: number;
  /** Overall wait for a not-yet-committed note. Defaults to four minutes. */
  timeoutMs?: number;
  /** Delay between commitment polls after reaching the current finalized and hot heads. */
  pollIntervalMs?: number;
  /** Fixed page size used for sequential leaf and shard-root requests. */
  pageSize?: number;
  /** Direct-chain current-root trust anchor override. */
  verifier?: RootVerifier;
  /** Direct-chain historical-root trust anchor override. */
  validRootVerifier?: ValidNotesRootVerifier;
  signal?: AbortSignal;
};

type OwnedNoteSelector = {
  /** Note spending and viewing keys; used only for local discovery. */
  spendingKey: string;
  viewingKey: string;
  /** Application-owned selection policy for locally discovered notes. */
  matchOwnedNote: (note: OwnedNote) => boolean;
  noteId?: never;
};

type NoteIdSelector = {
  /** Exact commitment reconstructed by the caller. */
  noteId: bigint | string;
  spendingKey?: never;
  viewingKey?: never;
  matchOwnedNote?: never;
};

export type ResolveNoteWitnessParameters = WithConfig<ResolveNoteWitnessBase & (OwnedNoteSelector | NoteIdSelector)>;

export type ResolvedNoteWitness = SuppliedInclusionProofs & {
  /** Present when the caller selects from notes discovered with owner keys. */
  ownedNote?: OwnedNote;
};

export interface ValidNotesRootVerifier {
  isValidRoot(root: bigint): Promise<boolean>;
}

/** Wait without leaving an abort listener behind after the timer fires. */
function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("The operation was aborted.", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Validate a checkpoint before any untrusted indexer data enters the local tree. */
function validateCheckpoint(
  checkpoint: FinalizedSyncCheckpoint,
  expected: { chainId: number; contractAddress: string },
): void {
  const production = getNotesTreeParameters();
  if (checkpoint.chainId !== expected.chainId) {
    throw new Error(`note witness scan: checkpoint chain ${checkpoint.chainId} does not match ${expected.chainId}`);
  }
  if (checkpoint.contractAddress.toLowerCase() !== expected.contractAddress.toLowerCase()) {
    throw new Error(
      `note witness scan: checkpoint contract ${checkpoint.contractAddress} does not match ${expected.contractAddress}`,
    );
  }
  if (checkpoint.treeVersion !== production.version) {
    throw new Error(`note witness scan: unsupported tree version ${checkpoint.treeVersion}`);
  }
  if (checkpoint.shardHeight !== production.shardHeight || checkpoint.shardSize !== production.shardSize) {
    throw new Error(`note witness scan: unsupported shard geometry h${checkpoint.shardHeight}/${checkpoint.shardSize}`);
  }
}

const VALID_NOTES_ROOT_ABI = [
  {
    type: "function",
    name: "validNotesRoot",
    inputs: [{ type: "uint256", name: "root" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;

function rpcValidNotesRootVerifier(config: CurvyConfig, networkSlug: string): ValidNotesRootVerifier {
  return {
    async isValidRoot(root) {
      const network = config.state.networks.find((candidate) => candidate.slug === networkSlug);
      const address = network?.aggregatorContractAddress;
      if (!address) throw new Error(`note witness scan: network ${networkSlug} has no aggregator contract`);
      const provider = (config.getRpc().Network(networkSlug) as EvmRpc).provider;
      return (await provider.readContract({
        address: address as `0x${string}`,
        abi: VALID_NOTES_ROOT_ABI,
        functionName: "validNotesRoot",
        args: [root],
      })) as boolean;
    },
  };
}

const toDecimal = (value: string): string => BigInt(value).toString();
const normalizeLeaf = (leaf: SyncedLeaf): SyncedLeaf => ({
  ...leaf,
  noteId: toDecimal(leaf.noteId),
  ephemeralKey: leaf.ephemeralKey
    ? [toDecimal(leaf.ephemeralKey[0]), toDecimal(leaf.ephemeralKey[1])]
    : leaf.ephemeralKey,
});

async function keysOwnershipResolver(
  config: CurvyConfig,
  spendingKey: string,
  viewingKey: string,
): Promise<OwnershipResolver> {
  const serializedOwner = await config.core.getBabyJubjubPublicKey(spendingKey);
  const ownerParts = serializedOwner.split(".");
  if (ownerParts.length !== 2) throw new Error("note witness scan: invalid gift spending key");
  const ownerPub: [bigint, bigint] = [BigInt(ownerParts[0]), BigInt(ownerParts[1])];
  const matches = new Map<string, OwnershipMatch>();
  const resolver: OwnershipResolver = async (leaf) => matches.get(leaf.noteId) ?? null;

  resolver.prescan = async (leaves) => {
    matches.clear();
    const discoverable = leaves.filter(
      (leaf): leaf is SyncedLeaf & { ephemeralKey: [string, string] } => leaf.ephemeralKey !== undefined,
    );
    if (discoverable.length === 0) return;
    const { spendingPubKeys } = await config.core.scanNotes(
      spendingKey,
      viewingKey,
      discoverable.map((leaf) => ({
        ephemeralKey: `${BigInt(leaf.ephemeralKey[0])}.${BigInt(leaf.ephemeralKey[1])}`,
        viewTag: (leaf.viewTag ?? 0).toString(16).padStart(2, "0"),
      })),
    );
    discoverable.forEach((leaf, index) => {
      const spendingPubKey = spendingPubKeys[index];
      if (!spendingPubKey) return;
      matches.set(leaf.noteId, {
        sharedSecret: BigInt(spendingPubKey.split(".")[0]),
        ownerPub,
      });
    });
  };
  return resolver;
}

async function loadShardPrefix(
  config: CurvyConfig,
  chainId: number,
  shardCount: number,
  checkpoint: FinalizedSyncCheckpoint,
  pageSize: number,
  signal?: AbortSignal,
): Promise<string[]> {
  const shardRoots: string[] = [];
  let from = 0;
  while (from < shardCount) {
    signal?.throwIfAborted();
    const page = await config.api.sync.GetShardRoots(
      chainId,
      from,
      Math.min(pageSize, shardCount - from),
      checkpoint.checkpoint,
    );
    if (page.checkpoint !== checkpoint.checkpoint) throw new Error("note witness scan: shard checkpoint changed");
    if (page.fromIndex !== from) {
      throw new Error(`note witness scan: shard page started at ${page.fromIndex}, expected ${from}`);
    }
    if (page.total !== checkpoint.shardCount) {
      throw new Error(`note witness scan: shard total ${page.total}, expected ${checkpoint.shardCount}`);
    }
    if (page.shardHeight !== checkpoint.shardHeight || page.shardSize !== checkpoint.shardSize) {
      throw new Error("note witness scan: shard page geometry changed");
    }
    if (page.nextIndex !== from + page.shardRoots.length || page.shardRoots.length === 0) {
      throw new Error("note witness scan: invalid or incomplete shard page");
    }
    shardRoots.push(...page.shardRoots.map(toDecimal));
    from = page.nextIndex;
  }
  return shardRoots;
}

function validateHotMeta(
  meta: GetSyncHotMetaReturnType,
  checkpoint: FinalizedSyncCheckpoint,
  expected: { chainId: number; contractAddress: string },
): void {
  if (meta.baseCheckpoint !== checkpoint.checkpoint) {
    throw new Error(`note witness scan: hot base ${meta.baseCheckpoint} does not match ${checkpoint.checkpoint}`);
  }
  if (meta.chainId !== expected.chainId) {
    throw new Error(`note witness scan: hot chain ${meta.chainId} does not match ${expected.chainId}`);
  }
  if (meta.contractAddress.toLowerCase() !== expected.contractAddress.toLowerCase()) {
    throw new Error(
      `note witness scan: hot contract ${meta.contractAddress} does not match ${expected.contractAddress}`,
    );
  }
  if (meta.treeVersion !== checkpoint.treeVersion) {
    throw new Error(`note witness scan: hot tree version ${meta.treeVersion} does not match ${checkpoint.treeVersion}`);
  }
  if (
    meta.finalizedBlockNumber !== checkpoint.finalizedBlockNumber ||
    meta.finalizedBlockHash !== checkpoint.finalizedBlockHash
  ) {
    throw new Error("note witness scan: hot base block does not match its finalized checkpoint");
  }
  if (meta.noteCount < checkpoint.noteCount || meta.nullifierCount < checkpoint.nullifierCount) {
    throw new Error("note witness scan: hot cursors regressed below their finalized checkpoint");
  }
  if (meta.finality.status === "provider_disagreement" || meta.finality.status === "deep_reorg") {
    throw new Error(`note witness scan: hot sync disabled while indexer status is ${meta.finality.status}`);
  }
}

async function loadHotBlocks(
  config: CurvyConfig,
  chainId: number,
  meta: GetSyncHotMetaReturnType,
  signal?: AbortSignal,
): Promise<SyncHotBlock[] | null> {
  const blocks: SyncHotBlock[] = [];
  let fromBlock = meta.finalizedBlockNumber + 1;
  while (fromBlock <= meta.hotBlockNumber) {
    signal?.throwIfAborted();
    let page: GetSyncHotBlocksReturnType;
    try {
      page = await config.api.sync.GetHotBlocks(chainId, meta.snapshot, fromBlock, HOT_BLOCK_PAGE_SIZE);
    } catch {
      // Hot snapshots are short-lived and can be invalidated by a reorg. Let the
      // outer poll obtain a new pinned snapshot instead of failing the claim.
      return null;
    }
    if (
      page.snapshot !== meta.snapshot ||
      page.fromBlock !== fromBlock ||
      page.hotBlockNumber !== meta.hotBlockNumber
    ) {
      throw new Error("note witness scan: hot page changed its pinned snapshot");
    }
    const lastBlock = page.blocks.at(-1);
    if (
      page.blocks.length === 0 ||
      !lastBlock ||
      page.blocks[0].number < fromBlock ||
      page.nextBlock !== lastBlock.number + 1 ||
      page.nextBlock <= fromBlock
    ) {
      throw new Error("note witness scan: hot page was incomplete");
    }
    blocks.push(...page.blocks);
    fromBlock = page.nextBlock;
  }
  return blocks;
}

/**
 * Resolve a note by scanning forward from a public lower-bound hint.
 *
 * Only completed shard roots before the hint's shard are fetched; individual
 * leaves begin at that shard boundary. A caller can select an exact commitment
 * by note ID, or discover owned notes locally and provide its own selection
 * predicate. Finalized leaves are checked first, followed by the checkpoint-pinned
 * hot suffix. After a match, scanning finishes that commit transaction and proves
 * against its historical root, which the V2 aggregator records in validNotesRoot.
 */
export async function resolveNoteWitness(
  parameters: ResolveNoteWitnessParameters,
): Promise<ResolvedNoteWitness | null> {
  const config = resolveConfig(parameters.config);
  const network = config.state.networks.find((candidate) => candidate.slug === parameters.networkSlug);
  if (!network) throw new Error(`resolveNoteWitness: unknown network "${parameters.networkSlug}"`);
  if (!network.aggregatorContractAddress) {
    throw new Error(`resolveNoteWitness: network "${parameters.networkSlug}" has no aggregator contract`);
  }

  const chainId = Number(network.chainId);
  const pageSize = parameters.pageSize ?? DEFAULT_PAGE_SIZE;
  const timeoutMs = parameters.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = parameters.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  if (!Number.isSafeInteger(parameters.scanFrom) || parameters.scanFrom < 0) {
    throw new Error("resolveNoteWitness: scanFrom must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new Error("resolveNoteWitness: pageSize must be a positive safe integer");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error("resolveNoteWitness: timeoutMs must be a non-negative finite number");
  }
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0) {
    throw new Error("resolveNoteWitness: pollIntervalMs must be a positive finite number");
  }

  let ownedNoteSelector:
    | {
        spendingKey: string;
        viewingKey: string;
        matchOwnedNote: (note: OwnedNote) => boolean;
      }
    | undefined;
  if (parameters.matchOwnedNote !== undefined) {
    if (
      typeof parameters.spendingKey !== "string" ||
      typeof parameters.viewingKey !== "string" ||
      !PRIVATE_KEY_PATTERN.test(parameters.spendingKey) ||
      !PRIVATE_KEY_PATTERN.test(parameters.viewingKey)
    ) {
      throw new Error("resolveNoteWitness: spendingKey and viewingKey must be 1..32-byte even-length hex keys");
    }
    ownedNoteSelector = {
      spendingKey: parameters.spendingKey,
      viewingKey: parameters.viewingKey,
      matchOwnedNote: parameters.matchOwnedNote,
    };
  }

  const discoversOwnedNotes = ownedNoteSelector !== undefined;
  if (!discoversOwnedNotes && parameters.noteId === undefined) {
    throw new Error("resolveNoteWitness: either owner keys with matchOwnedNote or noteId is required");
  }
  const expectedNoteId = parameters.noteId === undefined ? undefined : BigInt(parameters.noteId);
  const ownership = ownedNoteSelector
    ? await keysOwnershipResolver(config, ownedNoteSelector.spendingKey, ownedNoteSelector.viewingKey)
    : undefined;
  const verifier = parameters.verifier ?? rpcRootVerifier(config, parameters.networkSlug);
  const validRootVerifier = parameters.validRootVerifier ?? rpcValidNotesRootVerifier(config, parameters.networkSlug);
  const productionTree = getNotesTreeParameters();
  const startShard = Math.floor(parameters.scanFrom / productionTree.shardSize);
  const shardStart = startShard * productionTree.shardSize;
  const deadline = Date.now() + timeoutMs;
  let tree: ShardedNotesTree | undefined;
  let targetId: bigint | undefined;
  let targetCommitTx: string | undefined;
  let ownedNote: OwnedNote | undefined;

  const verifyProof = async (
    proof: ReturnType<ShardedNotesTree["witness"]>,
    selectedOwnedNote?: OwnedNote,
  ): Promise<ResolvedNoteWitness> => {
    if (!(await validRootVerifier.isValidRoot(proof.root))) {
      throw new Error(`note witness scan: assembled historical root ${proof.root} is not valid on-chain`);
    }
    return {
      proofs: [proof],
      notesRoot: proof.root,
      ...(selectedOwnedNote ? { ownedNote: selectedOwnedNote } : {}),
    };
  };

  const finish = async (): Promise<ResolvedNoteWitness> => {
    if (!tree || targetId === undefined) throw new Error("note witness scan: internal missing target state");
    return await verifyProof(tree.witness(targetId), ownedNote);
  };

  const resolveFromHotSuffix = async (
    checkpoint: FinalizedSyncCheckpoint,
    finalizedTree: ShardedNotesTree,
  ): Promise<ResolvedNoteWitness | null> => {
    let meta: GetSyncHotMetaReturnType | undefined;
    try {
      meta = await config.api.sync.GetHotMeta(chainId, checkpoint.checkpoint);
    } catch {
      // A deployment without hot-sync support still retains finalized polling.
      return null;
    }
    if (!meta) return null;
    validateHotMeta(meta, checkpoint, { chainId, contractAddress: network.aggregatorContractAddress as string });

    const blocks = await loadHotBlocks(config, chainId, meta, parameters.signal);
    if (!blocks) return null;

    let previousBlock = checkpoint.finalizedBlockNumber;
    let previousHash = checkpoint.finalizedBlockHash;
    for (const block of blocks) {
      if (block.number <= previousBlock || (block.number === previousBlock + 1 && block.parentHash !== previousHash)) {
        throw new Error(`note witness scan: hot block discontinuity at ${block.number}/${block.hash}`);
      }
      previousBlock = block.number;
      previousHash = block.hash;
    }
    if (previousBlock !== meta.hotBlockNumber || previousHash !== meta.hotBlockHash) {
      throw new Error("note witness scan: hot blocks did not end at the pinned head");
    }

    const hotTree = ShardedNotesTree.fromSnapshot(finalizedTree.snapshot());
    const candidates = blocks.flatMap((block) =>
      block.committedNotes.map(
        (note): SyncedLeaf =>
          normalizeLeaf({
            index: note.index,
            noteId: note.noteId,
            ephemeralKey: note.ephemeralKey,
            viewTag: note.viewTag,
            amount: note.amount,
            token: note.token,
            isPlaintext: note.isPlaintext,
            blockNumber: note.announcementBlockNumber ?? block.number,
            requestTxHash: note.transactionHash,
            commitBlockNumber: block.number,
            commitBlockHash: block.hash,
            commitTxHash: note.commitTransactionHash,
          }),
      ),
    );
    const discoverable = discoversOwnedNotes ? candidates.filter((leaf) => leaf.index >= parameters.scanFrom) : [];
    const discovered = ownership ? await discoverOwnedNotes(discoverable, ownership) : [];
    const discoveredByIndex = new Map(discovered.map((note) => [note.leafIndex, note]));

    let hotTargetId: bigint | undefined;
    let hotTargetCommitTx: string | undefined;
    let hotOwnedNote: OwnedNote | undefined;
    let hotProof: ReturnType<ShardedNotesTree["witness"]> | undefined;
    let candidateIndex = 0;
    let nullifierCount = checkpoint.nullifierCount;
    for (const block of blocks) {
      for (const committed of block.committedNotes) {
        const leaf = candidates[candidateIndex++];
        if (!leaf) throw new Error("note witness scan: missing normalized hot leaf");
        if (hotTargetCommitTx && committed.commitTransactionHash !== hotTargetCommitTx && !hotProof) {
          if (hotTargetId === undefined) throw new Error("note witness scan: internal missing hot target");
          hotProof = hotTree.witness(hotTargetId);
        }
        if (leaf.index !== hotTree.leafCount) {
          throw new Error(`note witness scan: hot leaf gap — expected index ${hotTree.leafCount}, got ${leaf.index}`);
        }

        const leafId = BigInt(leaf.noteId);
        const candidate = discoveredByIndex.get(leaf.index);
        const matchesOwnedNote =
          discoversOwnedNotes && candidate !== undefined && ownedNoteSelector?.matchOwnedNote(candidate) === true;
        const matchesNoteId = !discoversOwnedNotes && leaf.index >= parameters.scanFrom && leafId === expectedNoteId;
        if (hotTargetId === undefined && (matchesOwnedNote || matchesNoteId)) {
          hotTree.mark(leafId, leaf.index);
          hotTargetId = leafId;
          hotTargetCommitTx = committed.commitTransactionHash;
          hotOwnedNote = matchesOwnedNote ? candidate : undefined;
        }
        hotTree.append(leafId);
      }

      for (const nullifier of block.nullifiers) {
        if (nullifier.index !== nullifierCount) {
          throw new Error(
            `note witness scan: hot nullifier gap — expected index ${nullifierCount}, got ${nullifier.index}`,
          );
        }
        nullifierCount += 1;
      }
      if (nullifierCount !== block.postBlockNullifierCount) {
        throw new Error(`note witness scan: hot nullifier count mismatch at ${block.number}/${block.hash}`);
      }
      if (hotTree.leafCount !== block.postBlockNoteCount || hotTree.root() !== BigInt(block.postBlockNotesRoot)) {
        throw new Error(`note witness scan: hot post-block root/count mismatch at ${block.number}/${block.hash}`);
      }
    }
    if (hotTree.leafCount !== meta.noteCount || hotTree.root() !== BigInt(meta.notesRoot)) {
      throw new Error("note witness scan: hot final root/count does not match its pinned snapshot");
    }
    if (nullifierCount !== meta.nullifierCount) {
      throw new Error("note witness scan: hot final nullifier count does not match its pinned snapshot");
    }

    await reconcileWithChain(
      verifier,
      hotTree.leafCount,
      () => hotTree.root(),
      "note witness scan: hot assembled root",
      {
        checkpoint: meta.snapshot,
        chainId: meta.chainId,
        contractAddress: meta.contractAddress,
        treeVersion: meta.treeVersion,
        finalizedBlockNumber: meta.hotBlockNumber,
        finalizedBlockHash: meta.hotBlockHash,
        notesRoot: meta.notesRoot,
        noteCount: meta.noteCount,
        nullifierCount: meta.nullifierCount,
        shardHeight: checkpoint.shardHeight,
        shardSize: checkpoint.shardSize,
        shardCount: Math.floor(meta.noteCount / checkpoint.shardSize),
      },
    );

    if (hotTargetId === undefined) return null;
    hotProof ??= hotTree.witness(hotTargetId);
    return await verifyProof(hotProof, hotOwnedNote);
  };

  while (true) {
    parameters.signal?.throwIfAborted();
    const checkpoint = await config.api.sync.GetMeta(chainId);
    validateCheckpoint(checkpoint, {
      chainId,
      contractAddress: network.aggregatorContractAddress,
    });

    if (!tree) {
      if (checkpoint.shardCount < startShard) {
        // Even a future/incorrect hint must not turn an indexer omission into a
        // trusted absence: authenticate the checkpoint before waiting.
        await reconcileWithChain(
          verifier,
          checkpoint.noteCount,
          () => BigInt(checkpoint.notesRoot),
          "note witness scan: checkpoint root",
          checkpoint,
        );
      } else {
        const shardRoots = await loadShardPrefix(config, chainId, startShard, checkpoint, pageSize, parameters.signal);
        tree = ShardedNotesTree.fromSnapshot({
          depth: productionTree.depth,
          shardHeight: productionTree.shardHeight,
          shardRoots,
          liveLeaves: [],
          witnesses: [],
        });
        if (tree.leafCount !== shardStart) {
          throw new Error(`note witness scan: restored cursor ${tree.leafCount}, expected ${shardStart}`);
        }
      }
    }

    if (tree) {
      if (checkpoint.noteCount < tree.leafCount) {
        throw new Error(
          `note witness scan: checkpoint regressed below local cursor (${checkpoint.noteCount} < ${tree.leafCount})`,
        );
      }

      let from = tree.leafCount;
      while (from < checkpoint.noteCount) {
        parameters.signal?.throwIfAborted();
        const page = await config.api.sync.GetNotes(chainId, from, pageSize, checkpoint.checkpoint);
        if (page.checkpoint !== checkpoint.checkpoint) {
          throw new Error(`note witness scan: page checkpoint ${page.checkpoint} changed during the scan`);
        }
        if (page.fromIndex !== from || page.total !== checkpoint.noteCount) {
          throw new Error("note witness scan: invalid leaf page range");
        }
        if (page.nextIndex !== from + page.notes.length || page.notes.length > pageSize || page.notes.length === 0) {
          throw new Error("note witness scan: invalid or incomplete leaf page");
        }

        const normalized = page.notes.map(normalizeLeaf);
        const discoverable = discoversOwnedNotes ? normalized.filter((leaf) => leaf.index >= parameters.scanFrom) : [];
        const discovered = ownership ? await discoverOwnedNotes(discoverable, ownership) : [];
        const discoveredByIndex = new Map(discovered.map((note) => [note.leafIndex, note]));

        for (const leaf of normalized) {
          if (!leaf.commitTxHash) throw new Error(`note witness scan: leaf ${leaf.index} has no commit transaction`);
          if (targetCommitTx && leaf.commitTxHash !== targetCommitTx) return await finish();
          if (leaf.index !== tree.leafCount) {
            throw new Error(`note witness scan: leaf gap — expected index ${tree.leafCount}, got ${leaf.index}`);
          }

          const leafId = BigInt(leaf.noteId);
          const candidate = discoveredByIndex.get(leaf.index);
          const matchesOwnedNote =
            discoversOwnedNotes && candidate !== undefined && ownedNoteSelector?.matchOwnedNote(candidate) === true;
          const matchesNoteId = !discoversOwnedNotes && leaf.index >= parameters.scanFrom && leafId === expectedNoteId;

          if (targetId === undefined && (matchesOwnedNote || matchesNoteId)) {
            tree.mark(leafId, leaf.index);
            targetId = leafId;
            targetCommitTx = leaf.commitTxHash;
            ownedNote = matchesOwnedNote ? candidate : undefined;
          }
          tree.append(leafId);
        }
        from = page.nextIndex;
      }

      if (targetId !== undefined) return await finish();

      // A complete unsuccessful pass is checked against the direct-chain root,
      // preventing selective omission from becoming a plausible "not found".
      const assembledTree = tree;
      const reconciled = await reconcileWithChain(
        verifier,
        assembledTree.leafCount,
        () => assembledTree.root(),
        "note witness scan: assembled root",
        checkpoint,
      );
      if (!reconciled.caughtUp) {
        throw new Error(`note witness scan: finalized checkpoint is ${reconciled.indexerLag} leaves behind the chain`);
      }

      const hot = await resolveFromHotSuffix(checkpoint, assembledTree);
      if (hot) return hot;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;
    await abortableDelay(Math.min(pollIntervalMs, remaining), parameters.signal);
  }
}

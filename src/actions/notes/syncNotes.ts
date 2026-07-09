import { resolveConfig } from "@/config/global";
import type { CurvyConfig, NotesSyncEngine, WithConfig } from "@/config/types";
import { ScanError } from "@/errors";
import { discoverOwnedNotes, type OwnedNote, type OwnershipResolver } from "@/note/discoverOwnedNotes";
import { type LeafSource, type RootVerifier, type SyncedLeaf, syncNotesTree } from "@/note/notesTreeSync";
import { GlobalNotesTree, type NotesTreeView } from "@/note/notesTreeView";
import { syncShardedNotesTree } from "@/note/shardedNotesSync";
import type { Network } from "@/types/api";
import { poseidonHash } from "@/utils/hash/poseidonHash";
import { applyAccountDiscovery } from "./internal/applyDiscovery";
import { applySyncResult } from "./internal/applySyncResult";
import { apiLeafSource, coreOwnershipResolver, ownedNullifiersFromBalances, rpcRootVerifier } from "./internal/seams";

export type SyncNotesParameters = WithConfig<{
  /** Network to sync; omit to sync every active network with an aggregator. */
  networkSlug?: string;
  /** Account whose ownership/spends are reconciled; defaults to the active account. */
  accountId?: string;
  /** Override the config-level `notesSyncEngine` for this call (default: config's choice). */
  engine?: NotesSyncEngine;
  shardHeight?: number;
  pageSize?: number;
  /** Seam overrides (tests / alternative transports). Defaults: indexer API, direct RPC, balance-derived. */
  source?: LeafSource;
  verifier?: RootVerifier;
  resolveOwnership?: OwnershipResolver;
  /** Abort the sync — checked between networks and inside the indexer paged loops. */
  signal?: AbortSignal;
}>;

export type SyncNotesResult = {
  networkSlug: string;
  /** True iff level with the chain head (root verified against a direct RPC read). */
  caughtUp: boolean;
  indexerLag: number;
  leafCount: number;
  root: bigint;
  newOwnedCount: number;
  spentCount: number;
  /** True when another sync for this network was already in flight (nothing ran). */
  skipped?: boolean;
  /** Set when THIS network's sync failed — the other networks are unaffected. */
  error?: Error;
};

/**
 * Run one notes-tree sync pass per network: pull the indexer delta, discover
 * owned notes, reconcile spends, verify the assembled root against a DIRECT
 * chain read, persist, and apply the account-facing effects (balance entries +
 * tx history). The synced tree is kept on `config._internal.notesTrees` for
 * `getSpendWitnesses`.
 *
 * The working set is chosen by `config.notesSyncEngine` (or the per-call
 * `engine` override): "global" (default, the full in-memory IMT) or "sharded"
 * (lean-client profile — shard roots + tracked witnesses, a few MB at any tree
 * size; see plan-shardtree-curvy.md). Both verify against the same chain anchor
 * and emit identical witnesses downstream.
 */
export async function syncNotes(parameters: SyncNotesParameters = {}): Promise<SyncNotesResult[]> {
  const config = resolveConfig(parameters.config);
  const accountId = parameters.accountId ?? config.state.activeAccountId;

  const networks = parameters.networkSlug
    ? config.state.networks.filter((n) => n.slug === parameters.networkSlug)
    : config.state.activeNetworks.filter((n) => n.aggregatorContractAddress);
  // An explicit unknown network is a caller error; an empty "sync all" (a wallet
  // with no aggregator network yet) is simply nothing to do, not an error.
  if (networks.length === 0) {
    if (parameters.networkSlug)
      throw new ScanError(`syncNotes: unknown network "${parameters.networkSlug}"`, parameters.networkSlug);
    return [];
  }

  // Per-network isolation: a single network's failure (indexer 5xx, an RPC
  // hiccup in the root verifier, a transient reorg root-mismatch) must NOT abort
  // the whole refresh — the networks that DID sync have already persisted their
  // balances. Collect per-network errors and continue; only a total wipeout
  // (every network failed) is surfaced as a throw so the caller shows an error.
  const results: SyncNotesResult[] = [];
  const failures: Error[] = [];
  for (const network of networks) {
    parameters.signal?.throwIfAborted();
    try {
      results.push(await syncOneNetwork(config, network, accountId, parameters));
    } catch (error) {
      // A caller abort terminates the entire pass — don't swallow it as one
      // network's failure.
      if (parameters.signal?.aborted) throw error;
      const err = error instanceof Error ? error : new Error(String(error));
      failures.push(err);
      results.push(failedResult(network.slug, err));
    }
  }
  if (failures.length > 0 && failures.length === networks.length) {
    throw new ScanError(
      `syncNotes: all ${networks.length} network(s) failed — ${failures.map((e) => e.message).join("; ")}`,
    );
  }
  return results;
}

/** A per-network failure result — the sync threw for this network but others ran. */
function failedResult(networkSlug: string, error: Error): SyncNotesResult {
  return {
    networkSlug,
    caughtUp: false,
    indexerLag: 0,
    leafCount: 0,
    root: 0n,
    newOwnedCount: 0,
    spentCount: 0,
    error,
  };
}

async function syncOneNetwork(
  config: CurvyConfig,
  network: Network,
  accountId: string | null,
  parameters: SyncNotesParameters,
): Promise<SyncNotesResult> {
  const networkSlug = network.slug;
  const lockKey = `sync-notes-${networkSlug}`;
  if (config._internal.scanLocks.get(lockKey)) {
    return {
      networkSlug,
      caughtUp: false,
      indexerLag: 0,
      leafCount: 0,
      root: 0n,
      newOwnedCount: 0,
      spentCount: 0,
      skipped: true,
    };
  }
  config._internal.scanLocks.set(lockKey, true);

  try {
    const environment = config.state.environment;
    const source =
      parameters.source ??
      apiLeafSource(config, {
        chainId: Number(network.chainId),
        pageSize: parameters.pageSize,
        signal: parameters.signal,
      });
    const verifier = parameters.verifier ?? rpcRootVerifier(config, networkSlug);
    // Without an account there is still value in syncing (tree freshness);
    // discovery + spend reconciliation are account-scoped extras. The default
    // resolver is local-ECDH (WASM Core), so it discovers first-time-seen notes.
    const resolveOwnership =
      parameters.resolveOwnership ?? (accountId ? coreOwnershipResolver(config, accountId) : undefined);
    const ownedNullifiers = accountId ? await ownedNullifiersFromBalances(config, accountId, networkSlug) : undefined;

    // The committed-leaf cursor BEFORE this sync — the account may lag it (a new
    // account, a wallet import, or a sync that advanced the log while logged-out).
    // applyAccountDiscovery backfills discovery over the gap [cursor, treeCursorBefore).
    const treeCursorBefore = await config.storage.getCommittedLogCount(networkSlug, "leaf");

    const engine = parameters.engine ?? config.notesSyncEngine;
    const outcome = await runSyncEngine(engine, {
      storage: config.storage,
      networkSlug,
      environment,
      source,
      verifier,
      shardHeight: parameters.shardHeight,
      resolveOwnership,
      ownedNullifiers,
    });

    // Hand the warm tree to the spend path (getSpendWitnesses).
    config._internal.notesTrees.set(networkSlug, outcome.tree);

    let spentCount = 0;
    let newOwnedCount = outcome.newOwned.length;
    if (accountId && resolveOwnership) {
      // Account-scoped discovery: delta + historical backfill + metadata retries.
      const applied = await applyAccountDiscovery({
        config,
        accountId,
        network,
        environment,
        resolveOwnership,
        deltaOwned: outcome.newOwned,
        deltaLeaves: outcome.newLeaves,
        deltaSpentNoteIds: outcome.spentNoteIds,
        treeCursorBefore,
        head: outcome.leafCount,
        pageSize: parameters.pageSize,
        signal: parameters.signal,
      });
      spentCount = applied.removedCount;
      newOwnedCount = applied.addedCount;
    } else if (accountId) {
      // No ownership resolver (discovery disabled): reconcile the delta's spends
      // only, and do NOT advance the discovery cursor (nothing was scanned).
      const applied = await applySyncResult({
        storage: config.storage,
        accountId,
        networkSlug,
        environment,
        result: { newOwned: outcome.newOwned, newLeaves: outcome.newLeaves, spentNoteIds: outcome.spentNoteIds },
      });
      spentCount = applied.removed.length;
      newOwnedCount = applied.added.length;
    }

    return {
      networkSlug,
      caughtUp: outcome.caughtUp,
      indexerLag: outcome.indexerLag,
      leafCount: outcome.leafCount,
      root: outcome.root,
      newOwnedCount,
      spentCount,
    };
  } finally {
    config._internal.scanLocks.set(lockKey, false);
  }
}

type SyncEngineOptions = {
  storage: CurvyConfig["storage"];
  networkSlug: string;
  environment: CurvyConfig["state"]["environment"];
  source: LeafSource;
  verifier: RootVerifier;
  shardHeight?: number;
  resolveOwnership?: OwnershipResolver;
  ownedNullifiers?: Map<bigint, bigint>;
};

/** Engine-agnostic shape both sync engines normalize into. */
type SyncEngineOutcome = {
  tree: NotesTreeView;
  newOwned: OwnedNote[];
  newLeaves: SyncedLeaf[];
  spentNoteIds: bigint[];
  caughtUp: boolean;
  indexerLag: number;
  leafCount: number;
  root: bigint;
};

/**
 * Dispatch to the selected engine and normalize its result. The sharded engine
 * discovers + reconciles inline (marks must precede shard rollovers); the global
 * engine only maintains the full IMT, so discovery and spend reconciliation are
 * run here against its raw delta. Both end up at the same `SyncEngineOutcome`.
 */
async function runSyncEngine(engine: NotesSyncEngine, opts: SyncEngineOptions): Promise<SyncEngineOutcome> {
  const { storage, networkSlug, environment, source, verifier, resolveOwnership, ownedNullifiers } = opts;

  if (engine === "global") {
    const r = await syncNotesTree({ storage, networkSlug, environment, source, verifier });
    const newOwned = resolveOwnership ? await discoverOwnedNotes(r.newLeaves, resolveOwnership) : [];
    // Fold THIS window's discovered notes into the reconciliation lookup so a
    // note received-and-spent in one delta is reported spent (mirrors the
    // sharded engine; the pre-sync `ownedNullifiers` is stored-balances only).
    const reconNullifiers = new Map(ownedNullifiers ?? []);
    for (const note of newOwned) {
      reconNullifiers.set(poseidonHash([note.sharedSecret, note.ownerPub[0], note.ownerPub[1]]), BigInt(note.noteId));
    }
    const spentNoteIds: bigint[] = [];
    for (const nf of r.newNullifiers) {
      const noteId = reconNullifiers.get(nf);
      if (noteId !== undefined) spentNoteIds.push(noteId);
    }
    return {
      tree: new GlobalNotesTree(r.live),
      newOwned,
      newLeaves: r.newLeaves,
      spentNoteIds,
      caughtUp: r.caughtUp,
      indexerLag: r.indexerLag,
      leafCount: r.live.leaves.length,
      root: r.live.tree.root(),
    };
  }

  const r = await syncShardedNotesTree({
    storage,
    networkSlug,
    environment,
    source,
    verifier,
    shardHeight: opts.shardHeight,
    resolveOwnership,
    ownedNullifiers,
  });
  return {
    tree: r.tree,
    newOwned: r.newOwned,
    newLeaves: r.newLeaves,
    spentNoteIds: r.spentNoteIds,
    caughtUp: r.caughtUp,
    indexerLag: r.indexerLag,
    leafCount: r.tree.leafCount,
    root: r.tree.root(),
  };
}

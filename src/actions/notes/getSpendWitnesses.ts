import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { recoverWitness } from "@/note/shardedNotesSync";
import { ShardedNotesTree } from "@/note/shardedNotesTree";
import type { InclusionProof } from "@/proving/merkleTree";
import type { SuppliedInclusionProofs } from "@/proving/witnessFromNotes";
import { apiRangeSource } from "./internal/seams";

export type GetSpendWitnessesParameters = WithConfig<{
  networkSlug: string;
  /** Note ids to witness, in spend order (decimal strings or bigints). */
  noteIds: Array<bigint | string>;
  /**
   * Supplied leaf positions corresponding to `noteIds`. This lets a bearer-note
   * flow (for example a gift link) recover a sharded witness without first
   * writing the note into an unrelated account's balance storage. Positions
   * come from the chain-scoped indexer status route and are still verified
   * against the locally assembled, RPC-anchored tree root.
   */
  leafIndices?: Array<number | undefined>;
  /**
   * Persist witnesses recovered by this call. Disable for bearer notes that do
   * not belong to the active account: their witness is needed only long enough
   * to build this proof and must not enter the finalized wallet snapshot.
   * Defaults to true for ordinary account-owned cold-note recovery.
   */
  persistRecoveredWitnesses?: boolean;
  /** Account whose balance entries supply leaf indices for cold notes; defaults to active. */
  accountId?: string;
}>;

/**
 * Produce inclusion proofs for a spend from the synced notes tree. All returned
 * proofs share the same authenticated root.
 *
 * Under the sharded engine, cold notes (no witness tracked — e.g. restored
 * wallet) are recovered transparently: one shard fetch from the dumb leaf feed,
 * verified against the already-chain-anchored shard root, then persisted. The
 * global engine holds every leaf, so it never needs recovery.
 */
export async function getSpendWitnesses(parameters: GetSpendWitnessesParameters): Promise<SuppliedInclusionProofs> {
  const config = resolveConfig(parameters.config);
  const { networkSlug } = parameters;

  const tree = config._internal.notesTrees.get(networkSlug);
  if (!tree) {
    throw new Error(`getSpendWitnesses: no synced notes tree for "${networkSlug}" — run syncNotes first`);
  }

  // Cold-note recovery below reads that network's own chain-scoped indexer.
  const network = config.state.networks.find((n) => n.slug === networkSlug);
  if (!network) throw new Error(`getSpendWitnesses: unknown network "${networkSlug}"`);

  const accountId = parameters.accountId ?? config.state.activeAccountId;
  const persistRecoveredWitnesses = parameters.persistRecoveredWitnesses ?? true;
  const ephemeralWitnesses: bigint[] = [];

  try {
    const proofs: InclusionProof[] = [];
    for (const [noteIndex, raw] of parameters.noteIds.entries()) {
      const noteId = BigInt(raw);
      if (!tree.hasWitness(noteId)) {
        // The global engine holds every committed leaf, so a miss means the note
        // simply isn't synced. Only the sharded engine recovers cold notes (it
        // doesn't keep every witness).
        if (!(tree instanceof ShardedNotesTree)) {
          throw new Error(
            `getSpendWitnesses: note ${noteId} is not in the synced tree for "${networkSlug}" — sync first`,
          );
        }
        let leafIndex = parameters.leafIndices?.[noteIndex];
        if (leafIndex === undefined && accountId) {
          const entries = await config.storage.getBalances(accountId, config.state.environment);
          const entry = entries.find((e) => e.networkSlug === networkSlug && e.id === noteId.toString());
          leafIndex = entry?.leafIndex ?? undefined;
        }
        if (leafIndex === undefined) {
          throw new Error(
            `getSpendWitnesses: note ${noteId} is not witnessed and its balance entry has no leafIndex — sync first`,
          );
        }
        const shardIndex = leafIndex >> tree.shardHeight;
        if (shardIndex < tree.shardCount) {
          await recoverWitness(tree, apiRangeSource(config, { chainId: Number(network.chainId) }), noteId, leafIndex);
        } else {
          // The live shard is already in memory after sync; marking the externally
          // located leaf is enough to ask Rust for its authenticated path.
          tree.mark(noteId, leafIndex);
        }
        if (!persistRecoveredWitnesses) ephemeralWitnesses.push(noteId);
      }
      proofs.push(tree.witness(noteId));
    }

    // Persist any witnesses recovered above (sharded only; the global tree tracks
    // none). Idempotent for already-stored ones.
    if (tree instanceof ShardedNotesTree && persistRecoveredWitnesses) {
      for (const w of tree.drainDirtyWitnesses()) {
        await config.storage.putNoteWitness({
          networkSlug,
          noteId: w.noteId.toString(),
          leafIndex: w.leafIndex,
          shardIndex: w.shardIndex,
          withinShardSiblings: w.withinShardSiblings?.map(String) ?? null,
        });
      }
    }

    return { proofs, notesRoot: tree.root() };
  } finally {
    // Bearer-note proofs must not mutate the shared tree beyond this call. In
    // particular, do not let a hot, later-reorged leaf poison the durable
    // finalized snapshot with a stale owned-leaf marker.
    if (tree instanceof ShardedNotesTree) {
      for (const noteId of ephemeralWitnesses) tree.unmark(noteId);
    }
  }
}

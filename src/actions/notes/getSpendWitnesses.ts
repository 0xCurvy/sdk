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
  /** Account whose balance entries supply leaf indices for cold notes; defaults to active. */
  accountId?: string;
}>;

/**
 * Produce the `supplied` inclusion proofs for a spend/aggregation from the
 * synced notes tree (sharded or global) — the lean-client bridge the v3
 * client-proving planner commands will call. All proofs share one root (the
 * circuit's single `notesRoot`), regardless of how far apart the notes' leaf
 * indices are.
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

  const accountId = parameters.accountId ?? config.state.activeAccountId;

  const proofs: InclusionProof[] = [];
  for (const raw of parameters.noteIds) {
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
      if (!accountId) {
        throw new Error(`getSpendWitnesses: note ${noteId} has no witness and no account to resolve its leaf index`);
      }
      const entries = await config.storage.getBalances(accountId, config.state.environment);
      const entry = entries.find((e) => e.networkSlug === networkSlug && e.id === noteId.toString());
      if (entry?.leafIndex === undefined || entry.leafIndex === null) {
        throw new Error(
          `getSpendWitnesses: note ${noteId} is not witnessed and its balance entry has no leafIndex — sync first`,
        );
      }
      await recoverWitness(tree, apiRangeSource(config), noteId, entry.leafIndex);
    }
    proofs.push(tree.witness(noteId));
  }

  // Persist any witnesses recovered above (sharded only; the global tree tracks
  // none). Idempotent for already-stored ones.
  if (tree instanceof ShardedNotesTree) {
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
}

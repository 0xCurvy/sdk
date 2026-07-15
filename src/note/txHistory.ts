import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { BalanceEntry, TxHistoryEntry, TxHistoryKind } from "@/types/storage";
import type { OwnedNote } from "./discoverOwnedNotes";
import type { SyncedLeaf } from "./notesTreeSync";

// ─────────────────────────────────────────────────────────────────────────────
// Tx-history reducer — the chain-reconstruction fold of plan-shardtree-curvy.md
// §11. Pure: takes one sync pass's outcome and emits idempotent history
// entries (deterministic ids → re-running a sync upserts, never duplicates).
//
// What the chain feeds can faithfully reconstruct (and what this emits):
//   receive/deposit   — discovered note with PLAINTEXT delivery (vault shield)
//   receive/transfer  — discovered note with ENCRYPTED delivery (private send)
//   spend             — an owned note's nullifier appeared (possibly from
//                       another device); amounts come from the balance entry
//                       being reconciled away
// Sender identity and outgoing per-recipient splits are NOT reconstructible
// from chain state (by design — accepted limitation; see plan §11). The
// write-ahead intent log remains the richer, primary UX source when present.
// ─────────────────────────────────────────────────────────────────────────────

export const txHistoryId = (networkSlug: string, noteId: string, kind: TxHistoryKind): string =>
  `${networkSlug}:${noteId}:${kind}`;

export type ReduceSyncToHistoryParams = {
  accountId: string;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  /** Owned notes discovered this pass (from `SyncShardedNotesTreeResult.newOwned`). */
  newOwned: OwnedNote[];
  /** The pass's appended leaves — joined by noteId for block/request-tx metadata. */
  newLeaves: SyncedLeaf[];
  /** Balance entries reconciled away this pass (the spent notes, with amounts). */
  spentEntries: BalanceEntry[];
  /** Client clock (injectable for tests). */
  now: number;
};

/** Fold one sync pass into idempotent, account-scoped history entries. */
export function reduceSyncToHistory(params: ReduceSyncToHistoryParams): TxHistoryEntry[] {
  const { accountId, networkSlug, environment, now } = params;
  const leafByNoteId = new Map(params.newLeaves.map((l) => [l.noteId, l]));
  const entries: TxHistoryEntry[] = [];

  for (const owned of params.newOwned) {
    const leaf = leafByNoteId.get(owned.noteId);
    entries.push({
      id: txHistoryId(networkSlug, owned.noteId, "receive"),
      accountId,
      networkSlug,
      environment,
      kind: "receive",
      origin: leaf?.isPlaintext ? "deposit" : "transfer",
      noteId: owned.noteId,
      amount: owned.amount.toString(),
      token: owned.token.toString(),
      leafIndex: owned.leafIndex,
      requestTxHash: leaf?.requestTxHash,
      blockNumber: leaf?.blockNumber,
      blockHash: leaf?.commitBlockHash ?? leaf?.requestBlockHash,
      commitTxHash: leaf?.commitTxHash,
      finality: "finalized",
      status: "finalized",
      observedAt: now,
    });
  }

  for (const spent of params.spentEntries) {
    entries.push({
      id: txHistoryId(networkSlug, spent.id, "spend"),
      accountId,
      networkSlug,
      environment,
      kind: "spend",
      noteId: spent.id,
      amount: spent.balance.toString(),
      token: spent.vaultTokenId?.toString() ?? "0",
      leafIndex: spent.leafIndex ?? undefined,
      observedAt: now,
    });
  }

  return entries;
}

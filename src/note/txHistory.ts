import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { BalanceEntry, TxHistoryEntry, TxHistoryKind } from "@/storage/types";
import type { OwnedNote } from "./discoverOwnedNotes";
import type { SyncedLeaf } from "./notesTreeSync";

// Pure chain-history projection. Deterministic ids make repeated syncs
// idempotent.
//
// What the chain feeds can faithfully reconstruct (and what this emits):
//   receive/deposit   — discovered note with PLAINTEXT delivery (vault shield)
//   receive/transfer  — discovered note with ENCRYPTED delivery (private send)
//   spend             — an owned note's nullifier appeared (possibly from
//                       another device); amounts come from the balance entry
//                       being reconciled away
// Sender identity and outgoing recipient splits are private and cannot be
// reconstructed from chain state; locally-authored intent records add that UX.

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

import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { StorageInterface } from "@/interfaces/storage";
import { Note } from "@/note/note";
import { noteToBalanceEntry } from "@/note/noteToBalanceEntry";
import type { SyncShardedNotesTreeResult } from "@/note/shardedNotesSync";
import { reduceSyncToHistory } from "@/note/txHistory";
import type { HexString } from "@/types";
import type { BalanceEntry, TxHistoryEntry } from "@/types/storage";

export type ApplySyncResultParams = {
  storage: StorageInterface;
  accountId: string;
  networkSlug: string;
  environment: NETWORK_ENVIRONMENT_VALUES;
  result: Pick<SyncShardedNotesTreeResult, "newOwned" | "newLeaves" | "spentNoteIds">;
  /** Injectable clock for tests. */
  now?: number;
};

export type ApplySyncResultOutcome = {
  /** Balance entries created for newly discovered owned notes. */
  added: BalanceEntry[];
  /** Balance entries reconciled away (spent — possibly on another device). */
  removed: BalanceEntry[];
  /** Idempotent history entries written (receive + spend). */
  history: TxHistoryEntry[];
};

/**
 * Apply one sync pass's account-facing effects: discovered notes become
 * balance entries (with `leafIndex` filled), reconciled spends remove theirs,
 * and both fold into the tx-history log. Idempotent: re-applying the same
 * pass upserts identical state.
 */
export async function applySyncResult(params: ApplySyncResultParams): Promise<ApplySyncResultOutcome> {
  const { storage, accountId, networkSlug, environment, result } = params;
  const now = params.now ?? Date.now();

  const existing = (await storage.getBalances(accountId, environment)).filter((e) => e.networkSlug === networkSlug);
  const existingIds = new Set(existing.map((e) => e.id));

  // 1. Newly discovered owned notes → balance entries (skip ones the scan
  //    already recorded; skip tokens with no known currency metadata — the
  //    witness is still tracked, the balance surfaces once metadata exists).
  const spentIds = new Set(result.spentNoteIds.map(String));
  const added: BalanceEntry[] = [];
  for (const owned of result.newOwned) {
    if (existingIds.has(owned.noteId)) continue;
    // Received-and-spent in this same window — no live balance entry. (Step 2's
    // `removed` only scans `existing`, so a freshly-added one would never be
    // reconciled away → phantom balance.)
    if (spentIds.has(owned.noteId)) continue;
    let metadata: Awaited<ReturnType<StorageInterface["getCurrencyMetadata"]>>;
    try {
      metadata = await storage.getCurrencyMetadata(owned.token, networkSlug);
    } catch {
      continue;
    }
    const note = new Note({
      amount: owned.amount,
      token: owned.token,
      owner: {
        babyJubjubPublicKey: { x: owned.ownerPub[0], y: owned.ownerPub[1] },
        sharedSecret: owned.sharedSecret,
      },
      ephemeralKey: [owned.ephemeralKey[0], owned.ephemeralKey[1]],
      viewTag: BigInt(owned.viewTag),
    });
    const entry = noteToBalanceEntry(note, {
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      accountId,
      environment,
      networkSlug,
      currencyAddress: metadata.address as HexString,
    });
    entry.leafIndex = owned.leafIndex;
    added.push(entry);
  }

  // 2. Reconciled spends drop out of the set. `updateBalanceEntries` has
  //    full-replacement semantics per (account, network) — entries absent from
  //    the new set are deleted — so one write applies adds + removals together.
  const removed = existing.filter((e) => spentIds.has(e.id));
  if (added.length > 0 || removed.length > 0) {
    const nextSet = existing.filter((e) => !spentIds.has(e.id)).concat(added);
    await storage.updateBalanceEntries(accountId, networkSlug, nextSet);
  }

  // 3. Fold both into the (idempotent) history log.
  const history = reduceSyncToHistory({
    accountId,
    networkSlug,
    environment,
    newOwned: result.newOwned,
    newLeaves: result.newLeaves,
    spentEntries: removed,
    now,
  });
  if (history.length > 0) await storage.putTxHistory(history);

  return { added, removed, history };
}

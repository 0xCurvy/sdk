import type { CurvyConfig } from "@/config/types";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { discoverOwnedNotes, type OwnedNote, type OwnershipResolver } from "@/note/discoverOwnedNotes";
import type { SyncedLeaf } from "@/note/notesTreeSync";
import { nullifier as rustNullifier } from "@/proving/rustCore";
import type { CurvyAccountData, SerializedPendingNote } from "@/types/account";
import type { Network } from "@/types/api";
import { applySyncResult } from "./applySyncResult";
import { apiRangeSource } from "./seams";

// ─────────────────────────────────────────────────────────────────────────────
// Account-scoped discovery reconciliation. The committed-leaf log / tree cursor
// is account-INDEPENDENT (keyed by network only), but ownership discovery is
// account-scoped. So the delta the engine discovers only covers leaves committed
// SINCE the network last synced — a second account, an imported wallet, or a sync
// that advanced the log while logged-out would never trial-decrypt older leaves.
//
// This module closes that gap: it tracks a per-account discovery high-water mark,
// backfills discovery over any leaves below it that were never scanned for this
// account, retries notes stuck awaiting currency metadata, reconciles historical
// spends, and materialises the survivors into balance entries.
// ─────────────────────────────────────────────────────────────────────────────

/** The nullifier a note reveals when spent (matches the engine's reconciliation). */
const nullifierOf = (n: OwnedNote): bigint => rustNullifier(n.sharedSecret, n.ownerPub[0], n.ownerPub[1]);

const toPending = (n: OwnedNote): SerializedPendingNote => ({
  noteId: n.noteId,
  leafIndex: n.leafIndex,
  amount: n.amount.toString(),
  token: n.token.toString(),
  sharedSecret: n.sharedSecret.toString(),
  ownerPubX: n.ownerPub[0].toString(),
  ownerPubY: n.ownerPub[1].toString(),
  ephemeralKeyX: n.ephemeralKey[0].toString(),
  ephemeralKeyY: n.ephemeralKey[1].toString(),
  viewTag: n.viewTag,
});

const fromPending = (p: SerializedPendingNote): OwnedNote => ({
  noteId: p.noteId,
  leafIndex: p.leafIndex,
  amount: BigInt(p.amount),
  token: BigInt(p.token),
  sharedSecret: BigInt(p.sharedSecret),
  ownerPub: [BigInt(p.ownerPubX), BigInt(p.ownerPubY)],
  ephemeralKey: [BigInt(p.ephemeralKeyX), BigInt(p.ephemeralKeyY)],
  viewTag: p.viewTag,
});

export type ApplyAccountDiscoveryOptions = {
  config: CurvyConfig;
  accountId: string;
  network: Network;
  environment: NETWORK_ENVIRONMENT_VALUES;
  /** The account's ownership resolver (WASM-Core ECDH) — required to backfill. */
  resolveOwnership: OwnershipResolver;
  /** Owned notes the engine discovered in THIS sync's delta. */
  deltaOwned: OwnedNote[];
  /** The delta leaves (delivery data) — for tx-history correlation. */
  deltaLeaves: SyncedLeaf[];
  /** Note ids the engine reconciled as spent this delta (already-known notes). */
  deltaSpentNoteIds: bigint[];
  /** Committed-leaf count BEFORE this sync (the account may lag it). */
  treeCursorBefore: number;
  /** Committed-leaf count AFTER this sync (the tree head — new discovery mark). */
  head: number;
  pageSize?: number;
  signal?: AbortSignal;
};

export type ApplyAccountDiscoveryResult = {
  addedCount: number;
  removedCount: number;
  /** Notes still awaiting currency metadata (kept for retry next sync). */
  pendingCount: number;
  /** Leaves scanned by the backfill (0 when the account was already caught up). */
  backfilledLeaves: number;
};

/**
 * Reconcile one network's discovery for one account: backfill missed history,
 * retry metadata-pending notes, drop historical spends, materialise the rest, and
 * advance the account's per-network discovery cursor to the tree head.
 */
export async function applyAccountDiscovery(opts: ApplyAccountDiscoveryOptions): Promise<ApplyAccountDiscoveryResult> {
  const { config, accountId, network, environment, resolveOwnership } = opts;
  const networkSlug = network.slug;

  // The account record holds the cursor + pending set. Tolerate its absence
  // (unusual — login persists it): still materialise, just don't persist state.
  let account: CurvyAccountData | undefined;
  try {
    account = await config.storage.getCurvyAccountDataById(accountId);
  } catch {
    account = undefined;
  }
  const discoveryCursor = account?.discoveryCursors?.[networkSlug] ?? 0;

  // 1. Backfill: discover owned notes in leaves committed before this account's
  //    cursor. The tree is already built from the committed log; only ownership
  //    discovery needs the delivery data, re-fetched from the chain-scoped range
  //    feed. The commitment integrity gate in discoverOwnedNotes still applies.
  let backfillLeaves: SyncedLeaf[] = [];
  let backfillOwned: OwnedNote[] = [];
  if (discoveryCursor < opts.treeCursorBefore) {
    opts.signal?.throwIfAborted();
    const range = apiRangeSource(config, { chainId: Number(network.chainId), pageSize: opts.pageSize });
    backfillLeaves = await range.fetchRange(discoveryCursor, opts.treeCursorBefore - discoveryCursor);
    backfillOwned = await discoverOwnedNotes(backfillLeaves, resolveOwnership);
  }

  // 2. Notes previously discovered but not yet valued (metadata was missing).
  //    They carry their full value data, so retrying is a local map lookup — no
  //    re-scan. This is what heals a metadata-missing note instead of losing it.
  const pendingBefore = (account?.pendingNotes?.[networkSlug] ?? []).map(fromPending);

  // 3. Combine + de-dupe by noteId (a fresh delta/backfill discovery supersedes a
  //    stored pending copy of the same note).
  const byNoteId = new Map<string, OwnedNote>();
  for (const n of [...opts.deltaOwned, ...backfillOwned, ...pendingBefore]) {
    if (!byNoteId.has(n.noteId)) byNoteId.set(n.noteId, n);
  }
  const candidates = [...byNoteId.values()];

  // 4. Reconcile against the FULL nullifier set (not just the delta): a backfilled
  //    or long-pending note may already be spent — never surface it as a live
  //    balance (that would be a phantom).
  const nullifierLog = await config.storage.getCommittedLog(networkSlug, "nullifier");
  const spentSet = new Set(nullifierLog.map(BigInt));
  const spentNoteIds = new Set(opts.deltaSpentNoteIds.map((id) => id.toString()));
  for (const c of candidates) {
    if (spentSet.has(nullifierOf(c))) spentNoteIds.add(c.noteId);
  }

  // 5. Materialise. applySyncResult skips already-stored + spent ids and returns
  //    the notes it still can't value (metadata missing) so we can retry them.
  const { added, removed, pending } = await applySyncResult({
    storage: config.storage,
    accountId,
    networkSlug,
    environment,
    result: {
      newOwned: candidates,
      newLeaves: [...opts.deltaLeaves, ...backfillLeaves],
      spentNoteIds: [...spentNoteIds].map(BigInt),
    },
  });

  // 6. Advance the discovery cursor to the tree head and persist the (small) still-
  //    pending set. Whole-object replace — deep-merging arrays/maps would corrupt
  //    them. Only when the account record exists (prod always; some tests don't).
  if (account) {
    const discoveryCursors = { ...(account.discoveryCursors ?? {}), [networkSlug]: opts.head };
    const pendingNotes = { ...(account.pendingNotes ?? {}) };
    if (pending.length > 0) pendingNotes[networkSlug] = pending.map(toPending);
    else delete pendingNotes[networkSlug];
    await config.storage.replaceCurvyAccountData(accountId, { ...account, discoveryCursors, pendingNotes });
  }

  return {
    addedCount: added.length,
    removedCount: removed.length,
    pendingCount: pending.length,
    backfilledLeaves: backfillLeaves.length,
  };
}

import type { CurvyId } from "@/types/curvy";

type ScanCursors = {
  latest: number | undefined;
  oldest: number | undefined;
};

type ScanInfo = {
  scanCursors: ScanCursors;
  oldestCutoff: number;
};

type RefreshOptions = {
  signal?: AbortSignal;
  silent?: boolean;
};

/**
 * An owned note discovered but not yet materialised into a balance entry because
 * its token had no currency metadata at discovery time (a newly-listed token or a
 * transient storage read). Persisted per-account with its full value data so a
 * later sync can retry materialisation cheaply — without re-scanning the chain.
 */
type SerializedPendingNote = {
  noteId: string;
  leafIndex: number;
  amount: string;
  token: string;
  sharedSecret: string;
  ownerPubX: string;
  ownerPubY: string;
  ephemeralKeyX: string;
  ephemeralKeyY: string;
  viewTag: number;
};

type CurvyAccountData = {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: CurvyId;
  scanCursors: ScanCursors;
  /**
   * Per-network (keyed by networkSlug — already env-specific) high-water mark of
   * the committed-leaf index through which THIS account has run note discovery.
   * The committed-log/tree cursor is account-independent, so without this a second
   * account, an imported wallet, or an account-less checkpoint advance would never
   * trial-decrypt notes committed before it first synced. Lagging behind the tree
   * head triggers a discovery backfill over the gap.
   */
  discoveryCursors?: Record<string, number>;
  /** Per-network notes awaiting currency metadata before they can become balances. */
  pendingNotes?: Record<string, SerializedPendingNote[]>;
};

type AdditionalAccountData = {
  password?: string;
  credId?: ArrayBuffer;
};

type SerializedCurvyAccount = {
  readonly id: string;
  readonly createdAt: number;
  readonly ownerAddress: string;
  readonly curvyHandle: CurvyId;
};

export type {
  CurvyAccountData,
  ScanCursors,
  ScanInfo,
  SerializedCurvyAccount,
  SerializedPendingNote,
  AdditionalAccountData,
  RefreshOptions,
};

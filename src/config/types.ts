import type { WalletClient } from "viem";
import type { NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import type { RustCoreThreads } from "@/core/rustCore";
import type { CoreAdapter, CurvyKeyPairs } from "@/core/types";
import type { CurvyEventBus } from "@/events/types";
import type { Network, ProtocolConfig } from "@/http/contracts";
import type { CurvyApiClient } from "@/http/types";
import type { NotesTreeView } from "@/note/notesTreeView";
import type { PrivacyPassInternalState } from "@/privacy-pass/tokens";
import type { MerkleTree } from "@/proving";
import type { CircuitKeyCache } from "@/proving/circuitKeyCache";
import type { Prover } from "@/proving/prover";
import type { MultiRpc } from "@/rpc/multi";
import type { SessionKeystore } from "@/session-keystore";
import type { CurvyStorage } from "@/storage/contracts";
import type { CurvyAccountData } from "@/types/account";
import type { TimerHandle, TimerProvider } from "@/utils/timer";
import type { Store } from "./store";

export type ScanStatus = "idle" | "scanning" | "error";

/** Notes-tree sync engine selector — see the `syncNotes` action. */
export type NotesSyncEngine = "sharded" | "global";

/** How planner proofs are submitted after they are built. */
export type SubmissionMode = "relay" | "direct";

/**
 * Resolve the viem wallet client that submits a direct planner transaction.
 * The SDK never needs the underlying private key; the client may be backed by a
 * browser wallet, hardware signer, HSM, or server-side account.
 */
export type DirectSubmitter = (parameters: { network: Network }) => WalletClient | Promise<WalletClient>;

export type ExecutionPolicy = {
  relayPollAttempts: number;
  relayPollIntervalMs: number;
  planWaitAttempts: number;
  planWaitIntervalMs: number;
  aggregationOutputTimeoutMs: number;
  aggregationOutputPollIntervalMs: number;
  shieldSettleDelayMs: number;
};

/**
 * The reactive state held by a `CurvyConfig`. Holds only serializable data;
 * raw keypairs never live here — they stay in `config.keyring` (and the browser
 * keystore). `state.accounts` is the single source of truth for account
 * *metadata*; the event emitter remains the channel for *progress/notification*.
 */
export type CurvyState = {
  status: "initializing" | "ready";
  environment: NETWORK_ENVIRONMENT_VALUES;
  networks: Network[];
  activeNetworks: Network[];
  /** Protocol proving dimensions and fee collector. `null` until bootstrap completes. */
  protocol: ProtocolConfig | null;
  accounts: Record<string, CurvyAccountData>;
  activeAccountId: string | null;
  scan: { status: ScanStatus; progress: number; accountId?: string };
};

/** Internal wiring, not part of the public surface (wagmi `_internal` analog). */
export type CurvyConfigInternal = {
  timers: { price?: TimerHandle; jwtRefresh?: TimerHandle };
  /** Injectable timer scheduler (default wraps setInterval); swap for `chrome.alarms` under MV3. */
  timerProvider: TimerProvider;
  /** Per-operation locks that prevent overlapping refresh/sync work. */
  scanLocks: Map<string, boolean>;
  /**
   * In-flight `refreshBalances` promises keyed by `refresh-account-${accountId}`.
   * Lets a concurrent caller (e.g. `getBalances({ cached: false })`) AWAIT the
   * running scan and observe fresh data, instead of returning stale storage.
   */
  inflightRefreshes: Map<string, Promise<void>>;
  /** Memoized `MultiRpc` per environment. */
  rpcCache: Map<NETWORK_ENVIRONMENT_VALUES, MultiRpc>;

  /** Full tree used when building pending-note commitment witnesses. */
  notesTree: MerkleTree;
  /**
   * Per-network synced notes trees, keyed by networkSlug. Populated by the
   * `syncNotes` action, consumed by `getSpendWitnesses`. Holds whichever engine
   * the consumer's `notesSyncEngine` selected — a bounded `ShardedNotesTree`
   * (default) or a full `GlobalNotesTree`; both satisfy `NotesTreeView`.
   */
  notesTrees: Map<string, NotesTreeView>;
  /** Durable-base trees retained separately from the disposable effective view. */
  finalizedNotesTrees: Map<string, NotesTreeView>;

  /** Privacy Pass client state (challenge cache + single-flight refills); lazily initialized. */
  privacyPass?: PrivacyPassInternalState;
};

/**
 * The ambient value-bag every action operates on. Created by
 * `createCurvyConfig`, which also registers it as the global default so actions
 * can resolve it without it being threaded through every call.
 */
export type CurvyConfig = {
  readonly uid: string;

  readonly core: CoreAdapter;
  readonly api: CurvyApiClient;
  readonly storage: CurvyStorage;
  readonly emitter: CurvyEventBus;
  /** Browser-only keypair/JWT persistence for page-refresh survival; `null` in Node. */
  readonly keystore: SessionKeystore | null;

  /**
   * The keyring: each account's raw keypairs, keyed by account id. This is the
   * sole runtime home of private key material.
   * EPHEMERAL / in-memory only — keys live here, never in `state` (which is
   * serializable/reactive). Account *metadata* lives in `state.accounts`; an
   * account is "full"/registered iff it also has a `state.accounts` entry, and a
   * partial (handle-less) account exists only here. The browser keystore persists
   * keypairs across refresh; Node holds them only here.
   */
  readonly keyring: Map<string, CurvyKeyPairs>;

  // Reactive store.
  readonly store: Store<CurvyState>;
  readonly state: CurvyState;
  readonly setState: Store<CurvyState>["setState"];
  readonly subscribe: Store<CurvyState>["subscribe"];

  /** Lazily-built, memoized `MultiRpc` for the current environment. */
  getRpc: () => MultiRpc;

  /**
   * Which engine `syncNotes`/`getSpendWitnesses` use for a network's notes
   * tree: "sharded" (default, bounded live shard + witnesses) or "global" (full tree).
   * A consumer-level choice, fixed for the config's lifetime.
   */
  readonly notesSyncEngine: NotesSyncEngine;
  /** Host-tunable polling and settlement deadlines used by planner execution. */
  readonly executionPolicy: ExecutionPolicy;
  /** Default planner submission path. An estimate records this choice for execution. */
  readonly submissionMode: SubmissionMode;
  /** Optional signer adapter used when `submissionMode` is `direct`. */
  readonly directSubmitter?: DirectSubmitter;

  /**
   * The Groth16 prover used by the client-proving actions (`proveWithdrawal`,
   * `proveAggregation`). Defaults to the Rust/arkworks backend; inject a native
   * implementation (rapidsnark, a React Native native module) to offload the
   * heavy prove off the JS thread. See {@link Prover}.
   */
  readonly prover: Prover;

  /**
   * Base URL that `s3://<bucket>/<key>` circuit-key paths (from each network's
   * `CircuitConfig`) are rewritten against — `${circuitKeysBaseUrl}/<key>`. The
   * backend advertises keys as `s3://` URIs a client can't fetch directly; point
   * this at the CDN/host serving them. Unneeded when keys are local paths/https.
   */
  readonly circuitKeysBaseUrl?: string;

  /**
   * Persistent cache for downloaded circuit proving artifacts (wasm + zkey), so
   * the (large) keys are fetched once instead of on every prove. Defaults to the
   * Cache API in the browser and the filesystem on Node; undefined disables
   * caching (the prover fetches the URL each time). See {@link CircuitKeyCache}.
   */
  readonly circuitKeyCache?: CircuitKeyCache;

  /** Stop timers and detach listeners owned by this config. */
  destroy: () => Promise<void>;

  readonly _internal: CurvyConfigInternal;
};

export type CreateCurvyConfigParameters = {
  environment?: NETWORK_ENVIRONMENT_VALUES;
  apiBaseUrl?: string;
  /**
   * Base URL of the metadata service. When set, the `network.*`, `user.*`,
   * and `auth.*` API routes (currency/network metadata, Curvy ID registration
   * & resolution, JWT issuance) are routed here instead of `apiBaseUrl`.
   * Everything else (aggregator, relay, portals, sync) stays on `apiBaseUrl`
   * (or `indexerBaseUrl` for sync).
   */
  metadataBaseUrl?: string;
  /**
   * Base URL of the indexer. When set, the `sync.*` API routes (note +
   * nullifier streams + meta) are routed here instead of `apiBaseUrl`.
   * Everything else (auth, aggregator, relay, user, portals) stays on
   * `apiBaseUrl`.
   */
  indexerBaseUrl?: string;
  /**
   * Per-chain indexer base URLs, keyed by decimal `chainId`, for when each
   * chain runs its own single-chain indexer (e.g. eth / base / arbitrum). A chain
   * absent from the map falls back to `indexerBaseUrl`. The `chainId` is also sent
   * as a query param so an indexer rejects requests meant for another chain.
   */
  indexerBaseUrlsByChainId?: Record<string, string>;
  /**
   * Base URL of the relayer service. When set, the `relay.*` API routes
   * (proof submission + status polling) are routed here instead of
   * `apiBaseUrl`. Everything else (auth, aggregator, user, portals, sync)
   * stays on `apiBaseUrl` (or `metadataBaseUrl`/`indexerBaseUrl`).
   */
  relayerBaseUrl?: string;
  storage?: CurvyStorage;
  wasmUrl?: string;
  /** Pre-compiled core WASM module — pass this (instead of a URL) under MV3 to avoid a remote fetch. */
  wasmModule?: WebAssembly.Module;
  /** Inject a `core` (e.g. a fake) to make WASM-backed flows testable. */
  core?: CoreAdapter;
  enableKeystore?: boolean;
  customFetch?: typeof globalThis.fetch;
  /** Injectable timer scheduler (default wraps setInterval); swap for `chrome.alarms` under MV3. */
  timerProvider?: TimerProvider;
  /** Override planner polling/deadline defaults for the target chain or test host. */
  executionPolicy?: Partial<ExecutionPolicy>;
  /** Planner submission path. Defaults to `relay`. Can be overridden per estimate. */
  submissionMode?: SubmissionMode;
  /** Wallet-client resolver used for direct submission. It may also be supplied to `executeIntent`. */
  directSubmitter?: DirectSubmitter;
  /** Notes-sync engine for `syncNotes`/`getSpendWitnesses`. Defaults to "sharded". */
  notesSyncEngine?: NotesSyncEngine;
  /** Opt into the Rayon browser build. `auto` uses it only when the page is cross-origin isolated. */
  rustCoreThreads?: RustCoreThreads;
  /** Rayon policy for Rust witness generation/proving. Defaults to `rustCoreThreads` for compatibility. */
  rustProverThreads?: RustCoreThreads;
  /** Groth16 prover for the client-proving actions. Defaults to Rust/arkworks. */
  prover?: Prover;
  /** CDN/host base URL that `s3://` circuit-key paths are rewritten against (see `CurvyConfig.circuitKeysBaseUrl`). */
  circuitKeysBaseUrl?: string;
  /**
   * Cache for downloaded circuit proving artifacts. Omit for the platform default
   * (Cache API in the browser, filesystem on Node); pass a custom
   * {@link CircuitKeyCache}, or `false` to disable caching entirely.
   */
  circuitKeyCache?: CircuitKeyCache | false;
  /**
   * Register this config as the ambient/global default (so actions can resolve
   * it without an explicit `config`). Defaults to `true`. The ambient config is
   * a browser/single-tenant convenience — in a multi-tenant (server) context
   * pass `false` and thread `config` explicitly to avoid cross-tenant bleed.
   */
  setAsActive?: boolean;
};

/**
 * Every action takes a single options object; `config` is an optional field on
 * it that defaults to the ambient global. Compose domain params via the
 * generic: `WithConfig<{ accountId?: string }>`.
 */
export type WithConfig<T = unknown> = T & { config?: CurvyConfig };

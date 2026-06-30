import { vi } from "vitest";
import { CurvyAccount } from "@/account";
import { createStore } from "@/config/store";
import type { CurvyConfig, CurvyState } from "@/config/types";
import { NETWORK_ENVIRONMENT, type NETWORK_ENVIRONMENT_VALUES } from "@/constants/networks";
import { CurvyEventEmitter } from "@/events";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { StorageInterface } from "@/interfaces/storage";
import type { NotesTreeView } from "@/note/notesTreeView";
import { MerkleTree, snarkjsProver } from "@/proving";
import type { Prover } from "@/proving/prover";
import type { MultiRpc } from "@/rpc/multi";
import { MapStorage } from "@/storage/map-storage";
import type { CurvyAccountData } from "@/types/account";
import type { Network } from "@/types/api";
import type { CurvyKeyPairs } from "@/types/core";
import type { CurvyId } from "@/types/curvy";
import type { HexString } from "@/types/helper";
import type { BalanceEntry } from "@/types/storage";
import { defaultTimerProvider } from "@/utils/timer";

/**
 * Shared test fixtures. The fake `core`/`api`/`rpc`
 * are the injectable seams that let action tests run fully offline — no WASM,
 * no network, no chain. `storage` is the real in-memory `MapStorage`
 * (deterministic), so balance reads/writes exercise real logic.
 */

/** Deterministic test accounts. */
export const accounts: CurvyAccountData[] = [
  {
    id: "account-a",
    createdAt: 1_700_000_000_000,
    ownerAddress: "0x000000000000000000000000000000000000000a",
    curvyHandle: "alice.curvy.name" as CurvyId,
    scanCursors: { latest: undefined, oldest: undefined },
  },
  {
    id: "account-b",
    createdAt: 1_700_000_001_000,
    ownerAddress: "0x000000000000000000000000000000000000000b",
    curvyHandle: "bob.curvy.name" as CurvyId,
    scanCursors: { latest: undefined, oldest: undefined },
  },
];

export function createFakeCore(overrides: Partial<ICore> = {}): ICore {
  return {
    generateKeyPairs: vi.fn(),
    getCurvyKeys: vi.fn(),
    send: vi.fn(),
    sendNote: vi.fn(),
    getBabyJubjubPublicKey: vi.fn(),
    signWithBabyJubjubPrivateKey: vi.fn(),
    scan: vi.fn(),
    scanNotes: vi.fn(),
    viewerScan: vi.fn(),
    isValidBN254Point: vi.fn(() => true),
    isValidSECP256k1Point: vi.fn(() => true),
    version: vi.fn(() => "fake-core"),
    ...overrides,
  } as unknown as ICore;
}

export type FakeApiOverrides = {
  network?: Partial<IApiClient["network"]>;
  portal?: Partial<IApiClient["portal"]>;
  user?: Partial<IApiClient["user"]>;
  auth?: Partial<IApiClient["auth"]>;
  aggregator?: Partial<IApiClient["aggregator"]>;
  sync?: Partial<IApiClient["sync"]>;
};

/** Fake `IApiClient`; override individual resource methods per test. */
export function createFakeApi(overrides: FakeApiOverrides = {}): IApiClient {
  return {
    updateBearerToken: vi.fn(),
    get bearerToken() {
      return undefined;
    },
    network: {
      GetNetworks: vi.fn(async () => []),
      GetPrices: vi.fn(async () => []),
      GetProtocol: vi.fn(async () => ({
        proving: {
          aggregation: { treeDepth: 30, maxInputs: 2, maxOutputs: 3, batchSize: 5, groupFee: 1 },
          withdrawal: { treeDepth: 30, maxInputs: 2, maxOutputs: 0, batchSize: 5, groupFee: 2 },
          noteOwnership: { treeDepth: 0, maxInputs: 0, maxOutputs: 0, batchSize: 10, groupFee: 0 },
        },
      })),
      ...overrides.network,
    },
    portal: {
      insertEntryPortal: vi.fn(),
      insertExitPortal: vi.fn(),
      getPortalRecords: vi.fn(async () => ({ portals: [], nextCursor: null })),
      getPortalStatus: vi.fn(async () => null),
      ...overrides.portal,
    },
    user: {
      RegisterCurvyId: vi.fn(),
      ResolveCurvyId: vi.fn(),
      GetCurvyIdByOwnerAddress: vi.fn(),
      SetBabyJubjubKey: vi.fn(),
      ...overrides.user,
    },
    auth: {
      GetBearerTotp: vi.fn(),
      CreateBearerToken: vi.fn(),
      RefreshBearerToken: vi.fn(),
      ...overrides.auth,
    },
    aggregator: {
      SubmitWithdraw: vi.fn(),
      SubmitAggregation: vi.fn(),
      GetAggregatorRequestStatus: vi.fn(),
      ...overrides.aggregator,
    },
    sync: {
      GetMeta: vi.fn(),
      GetNotes: vi.fn(),
      GetNullifiers: vi.fn(),
      GetShardRoots: vi.fn(),
      ...overrides.sync,
    },
  } as unknown as IApiClient;
}

export function createFakeMultiRpc(): MultiRpc {
  return {
    getBalances: vi.fn(async () => ({})),
    ensResolveCurvyId: vi.fn(),
    Network: vi.fn(),
  } as unknown as MultiRpc;
}

/** Build a minimal but valid `Network` for tests. */
export function fixtureNetwork(overrides: Partial<Network> = {}): Network {
  return {
    id: 1,
    name: "Ethereum",
    alchemyName: "eth-mainnet",
    slug: "ethereum",
    group: "ethereum",
    testnet: false,
    slip0044: 60,
    flavour: "evm",
    multiCallContractAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    nativeCurrency: "ETH",
    chainId: "1",
    blockExplorerUrl: "https://etherscan.io",
    rpcUrl: "https://eth.example",
    currencies: [],
    ...overrides,
  };
}

/** Deterministic network fixtures: one mainnet, one testnet. */
export const fixtureNetworks: Network[] = [
  fixtureNetwork(),
  fixtureNetwork({
    id: 11155111,
    name: "Ethereum Sepolia",
    alchemyName: "eth-sepolia",
    slug: "ethereum-sepolia",
    testnet: true,
    chainId: "11155111",
  }),
];

/** Deterministic non-secret test keypairs for a `CurvyAccount`. */
export function fakeKeyPairs(overrides: Partial<CurvyKeyPairs> = {}): CurvyKeyPairs {
  return {
    s: "11".padStart(64, "0"),
    v: "22".padStart(64, "0"),
    S: "33".padStart(77, "0").concat(".").concat("44".padEnd(77, "0")),
    V: "55".padStart(77, "0").concat(".").concat("66".padEnd(77, "0")),
    babyJubjubPublicKey: "77".padStart(77, "0").concat(".").concat("88".padEnd(77, "0")),
    ...overrides,
  };
}

/** Build a live, key-bearing `CurvyAccount` for tests (uses fake keys, not real crypto). */
export function fakeCurvyAccount(
  overrides: { keyPairs?: Partial<CurvyKeyPairs>; curvyHandle?: CurvyId | null; ownerAddress?: string | null } = {},
): CurvyAccount {
  // Use presence checks (not `??`) so an explicit `null` builds a PARTIAL account
  // (isPartial === true) rather than coalescing back to the default.
  const curvyHandle = "curvyHandle" in overrides ? overrides.curvyHandle : ("alice.curvy.name" as CurvyId);
  const ownerAddress =
    "ownerAddress" in overrides ? overrides.ownerAddress : "0x000000000000000000000000000000000000000a";
  return new CurvyAccount(fakeKeyPairs(overrides.keyPairs), curvyHandle ?? null, ownerAddress ?? null);
}

export type CreateFakeConfigOverrides = {
  environment?: NETWORK_ENVIRONMENT_VALUES;
  activeAccountId?: string | null;
  /** Serializable account metadata for `state.accounts` (no keys). Merged over any derived from `liveAccounts`. */
  accounts?: Record<string, CurvyAccountData>;
  /**
   * `CurvyAccount` DTOs to pre-seed as if `addAccount` had run: each is decomposed
   * into `config.keyring` (keys, always) + `state.accounts` (metadata, non-partial
   * only). The map key becomes the keyring id.
   */
  liveAccounts?: Map<string, CurvyAccount>;
  networks?: Network[];
  activeNetworks?: Network[];
  storage?: StorageInterface;
  core?: ICore;
  api?: IApiClient;
  rpc?: MultiRpc;
  prover?: Prover;
  circuitKeysBaseUrl?: string;
};

/** Build a fully-typed `CurvyConfig` backed by fakes; safe to use offline. */
export function createFakeConfig(overrides: CreateFakeConfigOverrides = {}): CurvyConfig {
  const storage = overrides.storage ?? new MapStorage();
  const core = overrides.core ?? createFakeCore();
  const api = overrides.api ?? createFakeApi();
  const rpc = overrides.rpc ?? createFakeMultiRpc();
  const emitter = new CurvyEventEmitter();

  // Decompose any `liveAccounts` exactly as `addAccount` does: keypairs → keyring
  // (always), key-free metadata → state.accounts (registered/non-partial only).
  // Explicit `accounts` merge on top. Lets tests say "these accounts are added".
  const liveAccounts = overrides.liveAccounts ?? new Map<string, CurvyAccount>();
  const keyring = new Map<string, CurvyKeyPairs>();
  const derivedAccounts: Record<string, CurvyAccountData> = {};
  for (const [id, account] of liveAccounts) {
    keyring.set(id, account.keyPairs);
    if (!account.isPartial) {
      derivedAccounts[id] = { ...account.serialize(), scanCursors: { latest: undefined, oldest: undefined } };
    }
  }

  const store = createStore<CurvyState>({
    status: "ready",
    environment: overrides.environment ?? NETWORK_ENVIRONMENT.MAINNET,
    networks: overrides.networks ?? [],
    activeNetworks: overrides.activeNetworks ?? [],
    accounts: { ...derivedAccounts, ...(overrides.accounts ?? {}) },
    activeAccountId: overrides.activeAccountId ?? null,
    scan: { status: "idle", progress: 0 },
  });

  const internal = {
    timers: {},
    timerProvider: defaultTimerProvider(),
    scanLocks: new Map<string, boolean>(),
    inflightRefreshes: new Map<string, Promise<void>>(),
    rpcCache: new Map<NETWORK_ENVIRONMENT_VALUES, MultiRpc>(),
    notesTree: new MerkleTree({ depth: 30 }),
    notesTrees: new Map<string, NotesTreeView>(),
  };

  return {
    uid: "test-config",
    core,
    api,
    storage,
    emitter,
    keystore: null,
    keyring,
    store,
    get state() {
      return store.getState();
    },
    setState: store.setState,
    subscribe: store.subscribe,
    notesSyncEngine: "sharded",
    prover: overrides.prover ?? snarkjsProver,
    circuitKeysBaseUrl: overrides.circuitKeysBaseUrl,
    getRpc: () => rpc,
    async destroy() {
      internal.timers = {};
    },
    _internal: internal,
  };
}

/** Construct a valid `BalanceEntry` for `MapStorage`. */
export function fakeBalanceEntry(overrides: Partial<BalanceEntry> = {}): BalanceEntry {
  return {
    accountId: accounts[0].id,
    networkSlug: "ethereum",
    environment: NETWORK_ENVIRONMENT.MAINNET,
    currencyAddress: "0x0000000000000000000000000000000000000000",
    vaultTokenId: 1n,
    symbol: "ETH",
    decimals: 18,
    balance: 1000n,
    lastUpdated: 1_700_000_000_000,
    source: "0xabc" as HexString,
    id: "note-1",
    owner: { babyJubjubPublicKey: { x: "1", y: "2" }, sharedSecret: "3" },
    deliveryTag: { ephemeralKey: "0xeph", viewTag: "0x01" },
    ...overrides,
  };
}

import { v4 as uuidv4 } from "uuid";
import { restoreSession } from "@/actions/auth/restoreSession";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { Core } from "@/core";
import { CurvyEventEmitter } from "@/events";
import { ApiClient } from "@/http/api";
import { createRustProver, defaultCircuitKeyCache, MerkleTree } from "@/proving";
import { initCore as initRustCore } from "@/proving/rustCore";
import { newMultiRpc } from "@/rpc/factory";
import { SessionKeystore } from "@/session-keystore";
import { MapStorage } from "@/storage/map-storage";
import type { CurvyKeyPairs } from "@/types/core";
import { defaultTimerProvider, filterNetworks, networksToCurrencyMetadata, networksToPriceData } from "@/utils";
import { setCurvyConfig } from "./global";
import { KEYSTORE_JWT_KEY } from "./keystoreKeys";
import { startPriceRefresh } from "./priceRefresh";
import { createStore } from "./store";
import type { CreateCurvyConfigParameters, CurvyConfig, CurvyConfigInternal, CurvyState } from "./types";

/**
 * Create a `CurvyConfig` — the functional successor to `CurvySDK.init`.
 *
 * Builds the live IO subsystems (WASM core, API client, storage, event
 * emitter, optional keystore), seeds currency/price metadata, derives the
 * active networks for the chosen environment, and starts the price-refresh
 * timer. The returned config is also registered as the ambient global so
 * actions can be called without passing `config` (see `getCurvyConfig`).
 *
 * Remember to call `config.destroy()` (or `destroyConfig`) on teardown —
 * the price/JWT timers leak otherwise.
 *
 * @example
 * const config = await createCurvyConfig({ environment: "mainnet" });
 * const balances = await getBalances(); // uses the ambient config
 */
export async function createCurvyConfig(parameters: CreateCurvyConfigParameters = {}): Promise<CurvyConfig> {
  const {
    environment,
    apiBaseUrl,
    metadataBaseUrl,
    indexerBaseUrl,
    indexerBaseUrlsByChainId,
    relayerBaseUrl,
    storage = new MapStorage(),
    wasmUrl,
    wasmModule,
    core = new Core(wasmUrl, wasmModule),
    enableKeystore = false,
    customFetch,
    timerProvider = defaultTimerProvider(),
    notesSyncEngine = "sharded",
    rustCoreThreads = false,
    rustProverThreads = rustCoreThreads,
    prover,
    circuitKeysBaseUrl,
    circuitKeyCache,
    setAsActive = true,
  } = parameters;

  // Sharded sync and witness construction use synchronous Rust/WASM methods
  // after startup. Initialize their shared module before any tree is created;
  // concurrent configs reuse the same promise.
  const rustCoreSource = wasmModule ? { module: wasmModule } : wasmUrl ? { url: wasmUrl } : undefined;
  await initRustCore(rustCoreSource, { threads: rustCoreThreads });
  const activeProver = prover ?? createRustProver({ threads: rustProverThreads });

  const api = new ApiClient(apiBaseUrl, customFetch, {
    metadataBaseUrl,
    indexerBaseUrl,
    indexerBaseUrlsByChainId,
    relayerBaseUrl,
  });
  const emitter = new CurvyEventEmitter();
  api.setOnUnauthorized(() => emitter.emitUnauthorized({ statusCode: 401 }));

  const store = createStore<CurvyState>({
    status: "initializing",
    environment: NETWORK_ENVIRONMENT.MAINNET,
    networks: [],
    activeNetworks: [],
    protocol: null,
    accounts: {},
    activeAccountId: null,
    scan: { status: "idle", progress: 0 },
  });

  const internal: CurvyConfigInternal = {
    timers: {},
    timerProvider,
    scanLocks: new Map(),
    inflightRefreshes: new Map(),
    rpcCache: new Map(),
    notesTree: new MerkleTree({ depth: 30 }),
    notesTrees: new Map(),
    finalizedNotesTrees: new Map(),
  };

  // The keyring: raw keypairs (ephemeral, in-memory), keyed by account id.
  // Populated by auth/account actions; the browser keystore rehydrates it on
  // refresh via restoreSession. Account metadata lives in `state.accounts`.
  const keyring = new Map<string, CurvyKeyPairs>();

  let keystore: SessionKeystore | null = null;
  if (enableKeystore && typeof window !== "undefined") {
    keystore = new SessionKeystore({ name: "curvy-keypairs" });
    await keystore.ready();
    // Persist the JWT to the keystore under the magic `__jwt__` key on every
    // token change (initial auth + refresh). Per-account keypairs are co-tenants
    // in the same store; iteration must skip this key (see actions/auth/session).
    api.setOnTokenChange((token) => {
      if (token) keystore?.set(KEYSTORE_JWT_KEY, token);
      else keystore?.delete(KEYSTORE_JWT_KEY);
    });
  }

  // Split metadata: the registry (/networks, currencies carry their initial price) plus the
  // protocol-global config (/protocol). Protocol lives in `state.protocol` (the single source
  // consumers read) — it is NOT stamped onto the networks. The volatile /prices feed is the
  // poll endpoint used by the refresh timer, not the bootstrap.
  const [networks, protocol] = await Promise.all([api.network.GetNetworks(), api.network.GetProtocol()]);
  await storage.upsertCurrencyMetadata(networksToCurrencyMetadata(networks));

  const isTestnet = environment === NETWORK_ENVIRONMENT.TESTNET;
  const activeNetworks = filterNetworks(networks, isTestnet);
  if (activeNetworks.length === 0) {
    throw new Error(`No ${isTestnet ? "testnet" : "mainnet"} networks available after filtering.`);
  }
  const resolvedEnvironment = activeNetworks.some((network) => network.testnet)
    ? NETWORK_ENVIRONMENT.TESTNET
    : NETWORK_ENVIRONMENT.MAINNET;

  store.setState({ networks, activeNetworks, protocol, environment: resolvedEnvironment, status: "ready" });

  const priceData = networksToPriceData(networks);
  if (priceData.size > 0) await storage.upsertPriceData(priceData);

  const config: CurvyConfig = {
    uid: uuidv4(),
    core,
    api,
    storage,
    emitter,
    keystore,
    keyring,
    store,
    get state() {
      return store.getState();
    },
    setState: store.setState,
    subscribe: store.subscribe,
    notesSyncEngine,
    // Default prover: Curvy's Rust witness evaluator and arkworks Groth16 backend.
    prover: activeProver,
    circuitKeysBaseUrl,
    // Cache downloaded graph/zkey artifacts so they are fetched once, not per prove.
    // `false` disables; otherwise use the caller's cache or the platform default.
    circuitKeyCache: circuitKeyCache === false ? undefined : (circuitKeyCache ?? defaultCircuitKeyCache()),
    getRpc() {
      const env = store.getState().environment;
      const cached = internal.rpcCache.get(env);
      if (cached) return cached;
      const rpc = newMultiRpc(store.getState().activeNetworks);
      internal.rpcCache.set(env, rpc);
      return rpc;
    },
    async destroy() {
      internal.timers.price?.cancel();
      internal.timers.jwtRefresh?.cancel();
      internal.timers = {};
      api.setOnTokenChange(undefined);
      api.setOnUnauthorized(undefined);
      // Honour the "detach listeners" contract: drop every emitter subscriber
      // and release the memoized RPC clients so a destroyed config doesn't pin
      // them (or keep firing handlers) for the lifetime of the process.
      emitter.clearListeners();
      internal.rpcCache.clear();
      await activeProver.destroy?.();
    },
    _internal: internal,
  };

  startPriceRefresh(config);

  // The ambient/global config is a browser/single-tenant convenience only. In a
  // multi-tenant (server) context pass `setAsActive: false` so building a config
  // never clobbers another tenant's ambient config — thread `config` explicitly.
  if (setAsActive) setCurvyConfig(config);

  // Browser-only: rehydrate accounts + JWT from the keystore so a page refresh
  // doesn't force re-authentication. No-op in Node (keystore is null).
  await restoreSession({ config });

  return config;
}

import { v4 as uuidv4 } from "uuid";
import { restoreSession } from "@/actions/auth/restoreSession";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { createCoreAdapter } from "@/core";
import { getNotesTreeParameters, initCore as initRustCore } from "@/core/rustCore";
import type { CurvyKeyPairs } from "@/core/types";
import { CurvyEventEmitter } from "@/events";
import { ApiClient } from "@/http/api";
import { createRustProver, defaultCircuitKeyCache, MerkleTree } from "@/proving";
import { newMultiRpc } from "@/rpc/factory";
import { SessionKeystore } from "@/session-keystore";
import { MapStorage } from "@/storage/map-storage";
import { defaultTimerProvider, filterNetworks, networksToCurrencyMetadata, networksToPriceData } from "@/utils";
import { DEFAULT_EXECUTION_POLICY } from "./executionPolicy";
import { setCurvyConfig } from "./global";
import { KEYSTORE_JWT_KEY } from "./keystoreKeys";
import { startPriceRefresh } from "./priceRefresh";
import { createStore } from "./store";
import type { CreateCurvyConfigParameters, CurvyConfig, CurvyConfigInternal, CurvyState } from "./types";

/**
 * Create and initialize the SDK runtime.
 *
 * The returned config is registered as the ambient config by default, so
 * actions can omit their `config` option. Call `config.destroy()` (or
 * `destroyConfig`) when the owning application or request scope shuts down.
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
    core = createCoreAdapter({ wasmUrl, wasmModule }),
    enableKeystore = false,
    customFetch,
    timerProvider = defaultTimerProvider(),
    executionPolicy,
    submissionMode = "relay",
    directSubmitter,
    notesSyncEngine = "sharded",
    rustCoreThreads = false,
    rustProverThreads = rustCoreThreads,
    prover,
    circuitKeysBaseUrl,
    circuitKeyCache,
    setAsActive = true,
  } = parameters;

  // Initialize Rust before constructing state that calls its synchronous APIs.
  // Concurrent configs share the same race-safe initialization promise.
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
    notesTree: new MerkleTree({ depth: getNotesTreeParameters().depth }),
    notesTrees: new Map(),
    finalizedNotesTrees: new Map(),
  };

  // Private key material stays in memory. Serializable account metadata lives
  // in `state.accounts`; the browser keystore can restore keys across refreshes.
  const keyring = new Map<string, CurvyKeyPairs>();

  let keystore: SessionKeystore | null = null;
  if (enableKeystore && typeof window !== "undefined") {
    keystore = new SessionKeystore({ name: "curvy-keypairs" });
    await keystore.ready();
    // Keep the session JWT alongside account keys so a page refresh can restore
    // the authenticated session. The keystore hides this reserved entry.
    api.setOnTokenChange((token) => {
      if (token) keystore?.set(KEYSTORE_JWT_KEY, token);
      else keystore?.delete(KEYSTORE_JWT_KEY);
    });
  }

  // Load the network registry and protocol-wide proving parameters together;
  // live prices are refreshed separately after bootstrap.
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
    executionPolicy: { ...DEFAULT_EXECUTION_POLICY, ...executionPolicy },
    submissionMode,
    directSubmitter,
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

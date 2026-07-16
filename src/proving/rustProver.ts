import * as plainProverWasm from "./_prover_wasm/curvy_prover.js";
import type { Groth16Proof, ProofResult, Prover, ProverContext, PublicSignals, ZKArtifact } from "./prover";
import type { CoreWasmSource, RustCoreRuntimeStatus, RustCoreThreads } from "./rustCore";

declare const __CURVY_ASSETS_REL__: string;
declare const __CURVY_PROVER_RS_WASM_URL__: string;
declare const __CURVY_PROVER_RS_THREADS_WASM_URL__: string;

const NODE_ASSETS_REL = typeof __CURVY_ASSETS_REL__ === "string" ? __CURVY_ASSETS_REL__ : "../../assets";
const NODE_PROVER_WASM = `${NODE_ASSETS_REL}/core-rs/curvy_prover_bg.wasm`;
const NODE_PROVER_THREADS_WASM = `${NODE_ASSETS_REL}/core-rs/curvy_prover_threads_bg.wasm`;
const MAX_BROWSER_THREADS = 8;
const PROVER_WORKERS = Symbol.for("curvy.rustProverWorkers");

const isNode = typeof process !== "undefined" && !!process.versions?.node;

type WasmBindings = typeof plainProverWasm;
type ThreadedWasmBindings = WasmBindings & { initThreadPool(threadCount: number): Promise<unknown> };
type WasmCircuitProver = InstanceType<typeof plainProverWasm.WasmCircuitProver>;

export type RustProverOptions = {
  threads?: RustCoreThreads;
  /** Test/custom-hosting overrides; normal SDK consumers use the shipped assets. */
  wasm?: { single?: CoreWasmSource; threaded?: CoreWasmSource };
};

let wasm: WasmBindings = plainProverWasm;
let ready = false;
let initPromise: Promise<void> | null = null;
let runtimeStatus: RustCoreRuntimeStatus = { mode: "uninitialized", threadCount: 0 };

async function load(
  bindings: WasmBindings,
  nodeAssetPath: string,
  browserAssetUrl: URL | undefined,
  source?: CoreWasmSource,
): Promise<void> {
  if (source?.module) {
    bindings.initSync({ module: source.module });
    return;
  }
  if (source?.bytes) {
    await bindings.default({ module_or_path: source.bytes });
    return;
  }
  if (source?.url) {
    const parsedUrl = URL.canParse(source.url) ? new URL(source.url) : null;
    if (isNode && (!parsedUrl || parsedUrl.protocol === "file:")) {
      const { readFile } = await import("node:fs/promises");
      await bindings.default({ module_or_path: new Uint8Array(await readFile(parsedUrl ?? source.url)) });
      return;
    }
    await bindings.default({ module_or_path: source.url });
    return;
  }
  if (isNode) {
    const [{ readFile }, { dirname, join }, { fileURLToPath }] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
      import("node:url"),
    ]);
    const moduleDirectory = dirname(fileURLToPath(import.meta.url));
    const assetName = nodeAssetPath.split("/").at(-1) ?? "";
    const candidates = [
      join(moduleDirectory, nodeAssetPath),
      join(moduleDirectory, "..", "assets", "core-rs", assetName),
      join(moduleDirectory, "..", "..", "assets", "core-rs", assetName),
    ];
    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        const bytes = new Uint8Array(await readFile(candidate));
        await bindings.default({ module_or_path: bytes });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
  if (!browserAssetUrl) throw new Error("Curvy Rust prover browser asset URL is unavailable");
  await bindings.default({ module_or_path: browserAssetUrl });
}

const supportsBrowserThreads = (): boolean => {
  const isolated = (globalThis as typeof globalThis & { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
  return !isNode && isolated && typeof SharedArrayBuffer === "function" && typeof Worker === "function";
};

const resolveThreadCount = (threads: Exclude<RustCoreThreads, false>): number => {
  if (typeof threads === "number" && (!Number.isSafeInteger(threads) || threads < 1)) {
    throw new RangeError("Rust prover thread count must be a positive integer");
  }
  const hardwareThreads = typeof navigator === "undefined" ? 1 : Math.max(1, navigator.hardwareConcurrency || 1);
  const requested = threads === "auto" ? hardwareThreads : threads;
  return Math.min(requested, hardwareThreads, MAX_BROWSER_THREADS);
};

function terminateFailedThreadPool(): void {
  const holder = globalThis as typeof globalThis & { [PROVER_WORKERS]?: Array<{ terminate(): void }> };
  holder[PROVER_WORKERS]?.forEach((worker) => {
    worker.terminate();
  });
  delete holder[PROVER_WORKERS];
}

async function initialize(options: RustProverOptions): Promise<void> {
  const requestedThreads = options.threads ?? false;
  if (requestedThreads !== false && supportsBrowserThreads()) {
    try {
      const bindings = (await import("./_prover_wasm_threads/curvy_prover.js")) as unknown as ThreadedWasmBindings;
      const browserAssetUrl = isNode ? undefined : new URL(__CURVY_PROVER_RS_THREADS_WASM_URL__, import.meta.url);
      await load(bindings, NODE_PROVER_THREADS_WASM, browserAssetUrl, options.wasm?.threaded);
      const threadCount = resolveThreadCount(requestedThreads);
      await bindings.initThreadPool(threadCount);
      wasm = bindings;
      runtimeStatus = { mode: "multi-threaded", threadCount };
      return;
    } catch (error) {
      terminateFailedThreadPool();
      if (requestedThreads !== "auto") throw error;
    }
  } else if (typeof requestedThreads === "number") {
    throw new Error("Threaded Curvy Rust prover requires a cross-origin-isolated browser with Web Workers");
  }

  const browserAssetUrl = isNode ? undefined : new URL(__CURVY_PROVER_RS_WASM_URL__, import.meta.url);
  await load(plainProverWasm, NODE_PROVER_WASM, browserAssetUrl, options.wasm?.single);
  wasm = plainProverWasm;
  runtimeStatus = { mode: "single-threaded", threadCount: 1 };
}

/** Initialize the reusable arkworks runtime. Concurrent callers share one load. */
export async function initRustProver(options: RustProverOptions = {}): Promise<void> {
  if (ready) return;
  if (!initPromise) {
    initPromise = initialize(options)
      .then(() => {
        ready = true;
      })
      .catch((error) => {
        initPromise = null;
        runtimeStatus = { mode: "uninitialized", threadCount: 0 };
        throw error;
      });
  }
  return initPromise;
}

export const getRustProverRuntimeStatus = (): RustCoreRuntimeStatus => ({ ...runtimeStatus });

/**
 * Curvy's authenticated Rust witness evaluator and arkworks Groth16 prover.
 * Graphs and keys are parsed once per adapter instance.
 */
export function createRustProver(options: RustProverOptions = {}): Prover {
  const circuits = new Map<string, Promise<WasmCircuitProver>>();
  let destroyed = false;

  const getCircuit = (
    witnessGraph: ZKArtifact,
    expectedGraphSha256: string,
    zkey: ZKArtifact,
    expectedZkeySha256: string,
  ): Promise<WasmCircuitProver> => {
    const cacheKey = `${expectedGraphSha256.toLowerCase()}:${expectedZkeySha256.toLowerCase()}`;
    const cached = circuits.get(cacheKey);
    if (cached) return cached;
    const loading = Promise.all([loadArtifactBytes(zkey), loadArtifactBytes(witnessGraph)])
      .then(
        ([zkeyBytes, graphBytes]) =>
          new wasm.WasmCircuitProver(zkeyBytes, expectedZkeySha256, graphBytes, expectedGraphSha256),
      )
      .catch((error) => {
        circuits.delete(cacheKey);
        throw error;
      });
    circuits.set(cacheKey, loading);
    return loading;
  };

  return {
    async prove(input: object, witnessGraph: ZKArtifact, zkey: ZKArtifact, context?: ProverContext) {
      if (destroyed) throw new Error("Curvy Rust prover has been destroyed");
      if (!context?.zkeySha256) {
        throw new Error("Curvy Rust prover requires CircuitConfig.zkeySha256 from protocol metadata");
      }
      if (!context.witnessGraphSha256) {
        throw new Error("Curvy Rust prover requires CircuitConfig.witnessGraphSha256 from protocol metadata");
      }
      await initRustProver(options);
      const circuit = await getCircuit(witnessGraph, context.witnessGraphSha256, zkey, context.zkeySha256);
      return parseProofResult(circuit.prove(stringifyCircuitInput(input)));
    },
    async destroy() {
      destroyed = true;
      const settled = await Promise.allSettled(circuits.values());
      for (const result of settled) {
        if (result.status === "fulfilled") result.value.free();
      }
      circuits.clear();
    },
  };
}

function stringifyCircuitInput(input: object): string {
  return JSON.stringify(input, (_, value: unknown) => (typeof value === "bigint" ? value.toString(10) : value));
}

async function loadArtifactBytes(artifact: ZKArtifact): Promise<Uint8Array> {
  if (artifact instanceof Uint8Array) return artifact;
  if (isNode && (!URL.canParse(artifact) || artifact.startsWith("file:"))) {
    const [{ readFile }, { fileURLToPath }] = await Promise.all([import("node:fs/promises"), import("node:url")]);
    return new Uint8Array(await readFile(artifact.startsWith("file:") ? fileURLToPath(artifact) : artifact));
  }
  const response = await fetch(artifact);
  if (!response.ok) throw new Error(`Failed to fetch proving artifact: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function parseProofResult(json: string): ProofResult {
  const value: unknown = JSON.parse(json);
  if (!value || typeof value !== "object" || !("proof" in value) || !("publicSignals" in value)) {
    throw new Error("Rust prover returned an invalid proof envelope");
  }
  const proof = value.proof as Partial<Groth16Proof>;
  const publicSignals = value.publicSignals;
  if (
    !proof ||
    !Array.isArray(proof.pi_a) ||
    !Array.isArray(proof.pi_b) ||
    !Array.isArray(proof.pi_c) ||
    !Array.isArray(publicSignals)
  ) {
    throw new Error("Rust prover returned malformed Groth16 coordinates");
  }
  return { proof: proof as Groth16Proof, publicSignals: publicSignals as PublicSignals };
}

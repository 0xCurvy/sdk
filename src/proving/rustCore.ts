// Facade over the Rust crypto core (compiled to wasm). Provides the Domain-B
// primitives — Poseidon, BabyJubjub/EdDSA, the note cipher, note commitments,
// sha256BigInt — with the SAME signatures the TS implementations expose, so they
// drop in transparently.
//
// The real `.wasm` lives at
// assets/core-rs/curvy_core_bg.wasm and is loaded at runtime — fetched in the
// browser (via a tsup-injected `new URL(LITERAL, import.meta.url)` the consumer's
// bundler emits), read from disk in Node. Loading is async, so callers MUST
// `await initCore()` once before any synchronous primitive (`createCurvyConfig`
// already does; the Node v3 services should at startup; the vitest suite does via
// a setup file).

import * as plainWasm from "./_wasm/curvy_wasm.js";

// Per-format asset path literals injected by tsup `define` (see tsup.config.ts).
// Undefined in the non-built (vitest) environment → the Node branch uses the
// fallback; the browser `new URL(__CURVY_CORE_RS_WASM_URL__, …)` branch is only
// reached inside a real bundle where the define is present.
declare const __CURVY_ASSETS_REL__: string;
declare const __CURVY_CORE_RS_WASM_URL__: string;
declare const __CURVY_CORE_RS_THREADS_WASM_URL__: string;
declare const __CURVY_CORE_RAYON_WORKER_URL__: string;

const NODE_ASSETS_REL = typeof __CURVY_ASSETS_REL__ === "string" ? __CURVY_ASSETS_REL__ : "../../assets";
const NODE_CORE_RS_WASM = `${NODE_ASSETS_REL}/core-rs/curvy_core_bg.wasm`;
const NODE_CORE_RS_THREADS_WASM = `${NODE_ASSETS_REL}/core-rs/curvy_core_threads_bg.wasm`;
const MAX_BROWSER_THREADS = 8;
const CORE_WORKERS = Symbol.for("curvy.rustCoreWorkers");
const CORE_RAYON_WORKER_URL = Symbol.for("curvy.rustCoreRayonWorkerUrl");

const isNode = typeof process !== "undefined" && !!process.versions?.node;

/** Optional explicit wasm source (tests / custom hosting). */
export type CoreWasmSource = { module?: WebAssembly.Module; bytes?: BufferSource; url?: string };

/** Browser pool selection. `auto` uses Rayon only in a cross-origin-isolated context. */
export type RustCoreThreads = false | "auto" | number;

export type RustCoreRuntimeOptions = {
  threads?: RustCoreThreads;
};

export type RustCoreRuntimeStatus = {
  mode: "uninitialized" | "single-threaded" | "multi-threaded";
  threadCount: number;
};

type WasmBindings = typeof plainWasm;
type ThreadedWasmBindings = WasmBindings & { initThreadPool(threadCount: number): Promise<unknown> };

let wasm = plainWasm;

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
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const moduleDirectory = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      join(moduleDirectory, nodeAssetPath),
      join(moduleDirectory, "..", "assets", "core-rs", nodeAssetPath.split("/").at(-1) ?? ""),
      join(moduleDirectory, "..", "..", "assets", "core-rs", nodeAssetPath.split("/").at(-1) ?? ""),
    ];
    let bytes: Uint8Array | null = null;
    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        bytes = new Uint8Array(await readFile(candidate));
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!bytes) throw lastError;
    await bindings.default({ module_or_path: bytes });
  } else {
    if (!browserAssetUrl) throw new Error("Curvy Rust core browser asset URL is unavailable");
    await bindings.default({ module_or_path: browserAssetUrl });
  }
}

const supportsBrowserThreads = (): boolean => {
  const isolated = (globalThis as typeof globalThis & { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
  return !isNode && isolated && typeof SharedArrayBuffer === "function" && typeof Worker === "function";
};

const resolveThreadCount = (threads: Exclude<RustCoreThreads, false>): number => {
  if (typeof threads === "number" && (!Number.isSafeInteger(threads) || threads < 1)) {
    throw new RangeError("Rust core thread count must be a positive integer");
  }
  const hardwareThreads = typeof navigator === "undefined" ? 1 : Math.max(1, navigator.hardwareConcurrency || 1);
  const requested = threads === "auto" ? hardwareThreads : threads;
  return Math.min(requested, hardwareThreads, MAX_BROWSER_THREADS);
};

function terminateFailedThreadPool(): void {
  const holder = globalThis as typeof globalThis & {
    [CORE_WORKERS]?: Array<{ terminate(): void }>;
    [CORE_RAYON_WORKER_URL]?: string;
  };
  holder[CORE_WORKERS]?.forEach((worker) => {
    worker.terminate();
  });
  delete holder[CORE_WORKERS];
  delete holder[CORE_RAYON_WORKER_URL];
}

async function initialize(source: CoreWasmSource | undefined, options: RustCoreRuntimeOptions): Promise<void> {
  const requestedThreads = options.threads ?? false;
  if (requestedThreads !== false && supportsBrowserThreads()) {
    try {
      const bindings = (await import("./_wasm_threads/curvy_wasm.js")) as unknown as ThreadedWasmBindings;
      // Keep the define-injected literal directly inside new URL: bundlers only
      // emit the WASM asset when this call is statically analyzable.
      const browserAssetUrl = isNode ? undefined : new URL(__CURVY_CORE_RS_THREADS_WASM_URL__, import.meta.url);
      await load(bindings, NODE_CORE_RS_THREADS_WASM, browserAssetUrl, source);
      const threadCount = resolveThreadCount(requestedThreads);
      const holder = globalThis as typeof globalThis & { [CORE_RAYON_WORKER_URL]?: string };
      holder[CORE_RAYON_WORKER_URL] = new URL(__CURVY_CORE_RAYON_WORKER_URL__, import.meta.url).href;
      await bindings.initThreadPool(threadCount);
      delete holder[CORE_RAYON_WORKER_URL];
      wasm = bindings;
      runtimeStatus = { mode: "multi-threaded", threadCount };
      return;
    } catch (error) {
      terminateFailedThreadPool();
      if (requestedThreads !== "auto") throw error;
    }
  } else if (typeof requestedThreads === "number") {
    throw new Error("Threaded Curvy Rust core requires a cross-origin-isolated browser with Web Workers");
  }
  const browserAssetUrl = isNode ? undefined : new URL(__CURVY_CORE_RS_WASM_URL__, import.meta.url);
  await load(plainWasm, NODE_CORE_RS_WASM, browserAssetUrl, source);
  wasm = plainWasm;
  runtimeStatus = { mode: "single-threaded", threadCount: 1 };
}

/**
 * Initialize the Rust crypto core (wasm). MUST be awaited once before any
 * synchronous primitive. Idempotent — concurrent calls share a single load.
 */
export async function initCore(source?: CoreWasmSource, options: RustCoreRuntimeOptions = {}): Promise<void> {
  if (ready) return;
  if (!initPromise) {
    initPromise = initialize(source, options)
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

/** Whether the wasm core is ready for synchronous calls. */
export const isCoreReady = (): boolean => ready;

/** Active Rust execution mode, exposed for diagnostics and integration tests. */
export const getCoreRuntimeStatus = (): RustCoreRuntimeStatus => ({ ...runtimeStatus });

const ensure = (): void => {
  if (!ready) {
    throw new Error("Curvy Rust core not initialized — call `await initCore()` once before using synchronous crypto.");
  }
};

const FIELD_BYTES = 32;
const BN254_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Encode one canonical BN254 scalar as fixed-width big-endian bytes. */
export function fieldToBytes(value: bigint): Uint8Array {
  if (value < 0n || value >= BN254_SCALAR_FIELD) {
    throw new RangeError("field element is not canonical BN254 scalar data");
  }
  const bytes = new Uint8Array(FIELD_BYTES);
  let remaining = value;
  for (let index = FIELD_BYTES - 1; index >= 0; index--) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return bytes;
}

/** Concatenate canonical field elements for one bulk WASM boundary. */
export function fieldsToBytes(values: readonly bigint[]): Uint8Array {
  const packed = new Uint8Array(values.length * FIELD_BYTES);
  for (let index = 0; index < values.length; index++) {
    packed.set(fieldToBytes(values[index]), index * FIELD_BYTES);
  }
  return packed;
}

/** Decode one fixed-width big-endian field element. Rust already validated it. */
export function bytesToField(bytes: Uint8Array): bigint {
  if (bytes.length !== FIELD_BYTES) {
    throw new RangeError(`expected ${FIELD_BYTES} field bytes, got ${bytes.length}`);
  }
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

/** Decode concatenated canonical field elements returned by Rust. */
export function bytesToFields(bytes: Uint8Array): bigint[] {
  if (bytes.length % FIELD_BYTES !== 0) {
    throw new RangeError(`packed field byte length ${bytes.length} is not divisible by ${FIELD_BYTES}`);
  }
  const values: bigint[] = [];
  for (let offset = 0; offset < bytes.length; offset += FIELD_BYTES) {
    values.push(bytesToField(bytes.subarray(offset, offset + FIELD_BYTES)));
  }
  return values;
}

export type RustMerkleTree = InstanceType<typeof plainWasm.MerkleTree>;
export type RustOrderedMerkleTree = InstanceType<typeof plainWasm.OrderedMerkleTree>;
export type RustShardedNotesTree = InstanceType<typeof plainWasm.ShardedNotesTree>;
export type RustNotesFrontier = InstanceType<typeof plainWasm.NotesFrontier>;

export function createRustMerkleTree(depth: number): RustMerkleTree {
  ensure();
  return new wasm.MerkleTree(depth);
}

export function createRustMerkleTreeFromLeaves(depth: number, leaves: readonly bigint[]): RustMerkleTree {
  ensure();
  return wasm.MerkleTree.fromLeaves(depth, fieldsToBytes(leaves));
}

export function createRustOrderedMerkleTree(depth: number): RustOrderedMerkleTree {
  ensure();
  return new wasm.OrderedMerkleTree(depth);
}

export function createRustOrderedMerkleTreeFromLeaves(depth: number, leaves: readonly bigint[]): RustOrderedMerkleTree {
  ensure();
  return wasm.OrderedMerkleTree.fromLeaves(depth, fieldsToBytes(leaves));
}

export function createRustShardedNotesTree(depth: number, shardHeight: number): RustShardedNotesTree {
  ensure();
  return new wasm.ShardedNotesTree(depth, shardHeight);
}

export function restoreRustShardedNotesTree(snapshot: Uint8Array): RustShardedNotesTree {
  ensure();
  return wasm.ShardedNotesTree.restore(snapshot);
}

export function restoreRustShardedNotesTreeParts(
  depth: number,
  shardHeight: number,
  completedRoots: readonly bigint[],
  liveLeaves: readonly bigint[],
): RustShardedNotesTree {
  ensure();
  return wasm.ShardedNotesTree.restoreParts(
    depth,
    shardHeight,
    fieldsToBytes(completedRoots),
    fieldsToBytes(liveLeaves),
  );
}

export function createRustNotesFrontier(depth: number, shardHeight: number): RustNotesFrontier {
  ensure();
  return new wasm.NotesFrontier(depth, shardHeight);
}

export function restoreRustNotesFrontier(snapshot: Uint8Array): RustNotesFrontier {
  ensure();
  return wasm.NotesFrontier.restore(snapshot);
}

export function verifyRustMerkleProof(leaf: bigint, index: number, siblings: readonly bigint[], root: bigint): boolean {
  ensure();
  return wasm.verifyMerkleProof(fieldToBytes(leaf), index, fieldsToBytes(siblings), fieldToBytes(root));
}

export const poseidon = (inputs: bigint[]): bigint => {
  ensure();
  return BigInt(wasm.poseidon(inputs.map(String)));
};

export const ownerHash = (pubX: bigint, pubY: bigint, sharedSecret: bigint): bigint => {
  ensure();
  return BigInt(wasm.ownerHash(pubX.toString(), pubY.toString(), sharedSecret.toString()));
};

export const noteId = (ownerHashValue: bigint, amount: bigint, token: bigint): bigint => {
  ensure();
  return BigInt(wasm.noteId(ownerHashValue.toString(), amount.toString(), token.toString()));
};

export const nullifier = (sharedSecret: bigint, pubX: bigint, pubY: bigint): bigint => {
  ensure();
  return BigInt(wasm.nullifier(sharedSecret.toString(), pubX.toString(), pubY.toString()));
};

export const pubFromPrivateKey = (privateKeyHex: string): [bigint, bigint] => {
  ensure();
  const [x, y] = wasm.pubFromPrivateKey(privateKeyHex);
  return [BigInt(x), BigInt(y)];
};

export const ephemeralPubKey = (scalar: bigint): [bigint, bigint] => {
  ensure();
  const [x, y] = wasm.ephemeralPubKey(scalar.toString());
  return [BigInt(x), BigInt(y)];
};

export const sign = (message: bigint, privateKeyHex: string): { R8: [bigint, bigint]; S: bigint } => {
  ensure();
  const [r8x, r8y, s] = wasm.sign(message.toString(), privateKeyHex);
  return { R8: [BigInt(r8x), BigInt(r8y)], S: BigInt(s) };
};

export const encryptAmountToken = (
  amount: bigint,
  token: bigint,
  sharedSecret: bigint,
  ephemeralKey: readonly [bigint, bigint],
): { encryptedAmount: bigint; encryptedToken: bigint } => {
  ensure();
  const [a, t] = wasm.encryptAmountToken(
    amount.toString(),
    token.toString(),
    sharedSecret.toString(),
    ephemeralKey[0].toString(),
    ephemeralKey[1].toString(),
  );
  return { encryptedAmount: BigInt(a), encryptedToken: BigInt(t) };
};

export const decryptAmountToken = (
  encryptedAmount: bigint,
  encryptedToken: bigint,
  sharedSecret: bigint,
  ephemeralKey: readonly [bigint, bigint],
): { amount: bigint; token: bigint } => {
  ensure();
  const [a, t] = wasm.decryptAmountToken(
    encryptedAmount.toString(),
    encryptedToken.toString(),
    sharedSecret.toString(),
    ephemeralKey[0].toString(),
    ephemeralKey[1].toString(),
  );
  return { amount: BigInt(a), token: BigInt(t) };
};

export const sha256BigInt = (inputs: bigint[]): bigint => {
  ensure();
  return BigInt(wasm.sha256BigInt(inputs.map(String)));
};

/** Meta-keys: private spend `k`/view `v` and their public points `K`/`V`. */
export type StealthMeta = { k: string; v: string; K: string; V: string };
/** A stealth announcement: ephemeral scalar `r` + point `R`, `viewTag`, recipient `spendingPubKey`. */
export type StealthSend = { r: string; R: string; viewTag: string; spendingPubKey: string };
/** A scan candidate: `index` into the input arrays + the derived one-time keys. */
export type StealthScanMatch = { index: number; spendingPubKey: string; spendingPrivKey: string };
/** A viewer-scan candidate: derived spending PUBLIC key only. */
export type StealthViewerMatch = { index: number; spendingPubKey: string };

/**
 * The Domain-A stealth core (wasm). Replaces the Go-WASM `curvy` namespace, but
 * crosses the boundary as TYPED values — not the Go-era JSON strings (the Go core
 * could only marshal strings; wasm-bindgen passes structured values directly). The
 * inner value formats (points as "x.y", hex view tags / priv keys) are unchanged.
 * Each call requires the wasm to be initialized (`await initCore()`).
 */
export const stealthCore = {
  version: (): string => {
    ensure();
    return wasm.version();
  },
  new_meta: (): StealthMeta => {
    ensure();
    const [k, v, K, V] = wasm.new_meta();
    return { k, v, K, V };
  },
  get_meta: (s: string, v: string): StealthMeta => {
    ensure();
    const [k, vv, K, V] = wasm.get_meta(s, v);
    return { k, v: vv, K, V };
  },
  send: (S: string, V: string): StealthSend => {
    ensure();
    const [r, R, viewTag, spendingPubKey] = wasm.send(S, V);
    return { r, R, viewTag, spendingPubKey };
  },
  scan: (s: string, v: string, Rs: string[], viewTags: string[]): StealthScanMatch[] => {
    ensure();
    // SPARSE: one wasm-owned entry per tag-matching announcement. Copy each out
    // and free it eagerly (don't wait for GC).
    return wasm.scan(s, v, Rs, viewTags).map((m) => {
      const out = { index: m.index, spendingPubKey: m.spendingPubKey, spendingPrivKey: m.spendingPrivKey };
      m.free();
      return out;
    });
  },
  viewerScan: (v: string, S: string, Rs: string[], viewTags: string[]): StealthViewerMatch[] => {
    ensure();
    return wasm.viewerScan(v, S, Rs, viewTags).map((m) => {
      const out = { index: m.index, spendingPubKey: m.spendingPubKey };
      m.free();
      return out;
    });
  },
  dbg_isValidBN254Point: (point: string): boolean => {
    ensure();
    return wasm.dbg_isValidBN254Point(point);
  },
  dbg_isValidSECP256k1Point: (point: string): boolean => {
    ensure();
    return wasm.dbg_isValidSECP256k1Point(point);
  },
};

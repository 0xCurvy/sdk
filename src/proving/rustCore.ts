// Facade over the Rust crypto core (compiled to wasm). Provides the Domain-B
// primitives — Poseidon, BabyJubjub/EdDSA, the note cipher, note commitments,
// sha256BigInt — with the SAME signatures the TS implementations expose, so they
// drop in transparently.
//
// Loading mirrors the Go-WASM core: the real `.wasm` lives at
// assets/core-rs/curvy_core_bg.wasm and is loaded at runtime — fetched in the
// browser (via a tsup-injected `new URL(LITERAL, import.meta.url)` the consumer's
// bundler emits), read from disk in Node. Loading is async, so callers MUST
// `await initCore()` once before any synchronous primitive (`createCurvyConfig`
// already does; the Node v3 services should at startup; the vitest suite does via
// a setup file).

import initWasm, {
  initSync,
  MerkleTree as WasmMerkleTree,
  NotesFrontier as WasmNotesFrontier,
  ShardedNotesTree as WasmShardedNotesTree,
  // Domain A (stealth core) — typed wasm-bindgen exports (no JSON envelope).
  dbg_isValidBN254Point as wDbgBn254,
  dbg_isValidSECP256k1Point as wDbgSecp,
  decryptAmountToken as wDecryptAmountToken,
  encryptAmountToken as wEncryptAmountToken,
  ephemeralPubKey as wEphemeralPubKey,
  get_meta as wGetMeta,
  new_meta as wNewMeta,
  noteId as wNoteId,
  nullifier as wNullifier,
  ownerHash as wOwnerHash,
  poseidon as wPoseidon,
  pubFromPrivateKey as wPubFromPrivateKey,
  scan as wScan,
  send as wSend,
  sha256BigInt as wSha256BigInt,
  sign as wSign,
  verifyMerkleProof as wVerifyMerkleProof,
  version as wVersion,
  viewerScan as wViewerScan,
} from "./_wasm/curvy_wasm.js";

// Per-format asset path literals injected by tsup `define` (see tsup.config.ts).
// Undefined in the non-built (vitest) environment → the Node branch uses the
// fallback; the browser `new URL(__CURVY_CORE_RS_WASM_URL__, …)` branch is only
// reached inside a real bundle where the define is present.
declare const __CURVY_ASSETS_REL__: string;
declare const __CURVY_CORE_RS_WASM_URL__: string;

const NODE_ASSETS_REL = typeof __CURVY_ASSETS_REL__ === "string" ? __CURVY_ASSETS_REL__ : "../../assets";
const NODE_CORE_RS_WASM = `${NODE_ASSETS_REL}/core-rs/curvy_core_bg.wasm`;

const isNode = typeof process !== "undefined" && !!process.versions?.node;

/** Optional explicit wasm source (tests / custom hosting). */
export type CoreWasmSource = { module?: WebAssembly.Module; bytes?: BufferSource; url?: string };

let ready = false;
let initPromise: Promise<void> | null = null;

async function load(source?: CoreWasmSource): Promise<void> {
  if (source?.module) {
    initSync({ module: source.module });
    return;
  }
  if (source?.bytes) {
    await initWasm({ module_or_path: source.bytes });
    return;
  }
  if (source?.url) {
    await initWasm({ module_or_path: new URL(source.url) });
    return;
  }
  if (isNode) {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const moduleDirectory = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      join(moduleDirectory, NODE_CORE_RS_WASM),
      join(moduleDirectory, "..", "assets", "core-rs", "curvy_core_bg.wasm"),
      join(moduleDirectory, "..", "..", "assets", "core-rs", "curvy_core_bg.wasm"),
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
    await initWasm({ module_or_path: bytes });
  } else {
    await initWasm({ module_or_path: new URL(__CURVY_CORE_RS_WASM_URL__, import.meta.url) });
  }
}

/**
 * Initialize the Rust crypto core (wasm). MUST be awaited once before any
 * synchronous primitive. Idempotent — concurrent calls share a single load.
 */
export async function initCore(source?: CoreWasmSource): Promise<void> {
  if (ready) return;
  if (!initPromise) {
    initPromise = load(source).then(() => {
      ready = true;
    });
  }
  return initPromise;
}

/** Whether the wasm core is ready for synchronous calls. */
export const isCoreReady = (): boolean => ready;

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

export type RustMerkleTree = WasmMerkleTree;
export type RustShardedNotesTree = WasmShardedNotesTree;
export type RustNotesFrontier = WasmNotesFrontier;

export function createRustMerkleTree(depth: number): RustMerkleTree {
  ensure();
  return new WasmMerkleTree(depth);
}

export function createRustMerkleTreeFromLeaves(depth: number, leaves: readonly bigint[]): RustMerkleTree {
  ensure();
  return WasmMerkleTree.fromLeaves(depth, fieldsToBytes(leaves));
}

export function createRustShardedNotesTree(depth: number, shardHeight: number): RustShardedNotesTree {
  ensure();
  return new WasmShardedNotesTree(depth, shardHeight);
}

export function restoreRustShardedNotesTree(snapshot: Uint8Array): RustShardedNotesTree {
  ensure();
  return WasmShardedNotesTree.restore(snapshot);
}

export function restoreRustShardedNotesTreeParts(
  depth: number,
  shardHeight: number,
  completedRoots: readonly bigint[],
  liveLeaves: readonly bigint[],
): RustShardedNotesTree {
  ensure();
  return WasmShardedNotesTree.restoreParts(
    depth,
    shardHeight,
    fieldsToBytes(completedRoots),
    fieldsToBytes(liveLeaves),
  );
}

export function createRustNotesFrontier(depth: number, shardHeight: number): RustNotesFrontier {
  ensure();
  return new WasmNotesFrontier(depth, shardHeight);
}

export function restoreRustNotesFrontier(snapshot: Uint8Array): RustNotesFrontier {
  ensure();
  return WasmNotesFrontier.restore(snapshot);
}

export function verifyRustMerkleProof(leaf: bigint, index: number, siblings: readonly bigint[], root: bigint): boolean {
  ensure();
  return wVerifyMerkleProof(fieldToBytes(leaf), index, fieldsToBytes(siblings), fieldToBytes(root));
}

export const poseidon = (inputs: bigint[]): bigint => {
  ensure();
  return BigInt(wPoseidon(inputs.map(String)));
};

export const ownerHash = (pubX: bigint, pubY: bigint, sharedSecret: bigint): bigint => {
  ensure();
  return BigInt(wOwnerHash(pubX.toString(), pubY.toString(), sharedSecret.toString()));
};

export const noteId = (ownerHashValue: bigint, amount: bigint, token: bigint): bigint => {
  ensure();
  return BigInt(wNoteId(ownerHashValue.toString(), amount.toString(), token.toString()));
};

export const nullifier = (sharedSecret: bigint, pubX: bigint, pubY: bigint): bigint => {
  ensure();
  return BigInt(wNullifier(sharedSecret.toString(), pubX.toString(), pubY.toString()));
};

export const pubFromPrivateKey = (privateKeyHex: string): [bigint, bigint] => {
  ensure();
  const [x, y] = wPubFromPrivateKey(privateKeyHex);
  return [BigInt(x), BigInt(y)];
};

export const ephemeralPubKey = (scalar: bigint): [bigint, bigint] => {
  ensure();
  const [x, y] = wEphemeralPubKey(scalar.toString());
  return [BigInt(x), BigInt(y)];
};

export const sign = (message: bigint, privateKeyHex: string): { R8: [bigint, bigint]; S: bigint } => {
  ensure();
  const [r8x, r8y, s] = wSign(message.toString(), privateKeyHex);
  return { R8: [BigInt(r8x), BigInt(r8y)], S: BigInt(s) };
};

export const encryptAmountToken = (
  amount: bigint,
  token: bigint,
  sharedSecret: bigint,
  ephemeralKey: readonly [bigint, bigint],
): { encryptedAmount: bigint; encryptedToken: bigint } => {
  ensure();
  const [a, t] = wEncryptAmountToken(
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
  const [a, t] = wDecryptAmountToken(
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
  return BigInt(wSha256BigInt(inputs.map(String)));
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
    return wVersion();
  },
  new_meta: (): StealthMeta => {
    ensure();
    const [k, v, K, V] = wNewMeta();
    return { k, v, K, V };
  },
  get_meta: (s: string, v: string): StealthMeta => {
    ensure();
    const [k, vv, K, V] = wGetMeta(s, v);
    return { k, v: vv, K, V };
  },
  send: (S: string, V: string): StealthSend => {
    ensure();
    const [r, R, viewTag, spendingPubKey] = wSend(S, V);
    return { r, R, viewTag, spendingPubKey };
  },
  scan: (s: string, v: string, Rs: string[], viewTags: string[]): StealthScanMatch[] => {
    ensure();
    // SPARSE: one wasm-owned entry per tag-matching announcement. Copy each out
    // and free it eagerly (don't wait for GC).
    return wScan(s, v, Rs, viewTags).map((m) => {
      const out = { index: m.index, spendingPubKey: m.spendingPubKey, spendingPrivKey: m.spendingPrivKey };
      m.free();
      return out;
    });
  },
  viewerScan: (v: string, S: string, Rs: string[], viewTags: string[]): StealthViewerMatch[] => {
    ensure();
    return wViewerScan(v, S, Rs, viewTags).map((m) => {
      const out = { index: m.index, spendingPubKey: m.spendingPubKey };
      m.free();
      return out;
    });
  },
  dbg_isValidBN254Point: (point: string): boolean => {
    ensure();
    return wDbgBn254(point);
  },
  dbg_isValidSECP256k1Point: (point: string): boolean => {
    ensure();
    return wDbgSecp(point);
  },
};

import { isNode } from "@/utils/common";
import type { ZKArtifact } from "./prover";

/**
 * A persistent cache for downloaded circuit proving artifacts (wasm + zkey).
 *
 * These are large (wasm ~MBs, zkey ~tens of MBs), published as immutable
 * objects, and fetched on every prove. A metadata-provided digest also versions
 * the cache identity, so a same-URL emergency rotation cannot reuse old bytes.
 * The zkey in particular is
 * read by snarkjs via HTTP Range requests, which the browser HTTP cache handles
 * unreliably; caching the full bytes here lets us hand the prover an in-memory
 * buffer instead (no Range, no network after the first fetch, works offline).
 *
 * This is deliberately NOT `config.storage` (the small structured account-data
 * store, which on some platforms is backed by size-limited KV like RN
 * AsyncStorage). Defaults: the Cache API in the browser, the filesystem in Node.
 * Keyed by the fully-resolved artifact URL.
 */
export interface CircuitKeyCache {
  /** Cached bytes for `key` (the resolved artifact URL), or null on a miss. */
  get(key: string): Promise<Uint8Array | null>;
  /** Store `bytes` for `key`. Best-effort: a failed put just means the next read misses. */
  put(key: string, bytes: Uint8Array): Promise<void>;
}

const CACHE_NAME = "curvy-circuit-keys-v1";

/**
 * Browser default — the Cache API (`caches`). Purpose-built for large HTTP
 * assets, persists across sessions, and is separate from the account-data store.
 * Degrades to a no-op (every read a miss) where the Cache API is unavailable
 * (e.g. an insecure context), so proving falls back to fetching the URL.
 */
export function createCacheApiCircuitKeyCache(): CircuitKeyCache {
  return {
    async get(key) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const res = await cache.match(key);
        return res ? new Uint8Array(await res.arrayBuffer()) : null;
      } catch {
        return null;
      }
    },
    async put(key, bytes) {
      try {
        const cache = await caches.open(CACHE_NAME);
        // Store as a fresh 200 response (Cache API rejects partial/206 responses).
        // Cast: TS types `Uint8Array<ArrayBufferLike>` wider than `BodyInit` (which
        // excludes SharedArrayBuffer-backed views), but our bytes are ArrayBuffer-backed.
        await cache.put(
          key,
          new Response(bytes as BodyInit, { headers: { "Content-Type": "application/octet-stream" } }),
        );
      } catch {
        // best-effort
      }
    },
  };
}

/**
 * Node default — a filesystem cache under `os.tmpdir()/curvy-circuit-keys`
 * (override with `dir`). Node builtins are imported dynamically so this module
 * stays safe to include in browser bundles (these methods never run there).
 */
export function createFsCircuitKeyCache(dir?: string): CircuitKeyCache {
  const ready = (async () => {
    const [fs, path, os, crypto] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
      import("node:os"),
      import("node:crypto"),
    ]);
    const baseDir = dir ?? path.join(os.tmpdir(), "curvy-circuit-keys");
    await fs.mkdir(baseDir, { recursive: true });
    return { fs, path, crypto, baseDir };
  })();

  const fileFor = async (key: string) => {
    const { path, crypto, baseDir } = await ready;
    // Hash the URL for a collision-free flat filename; keep the original basename
    // as a human-readable suffix for debugging.
    const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
    const name = (key.split(/[/?#]/).pop() || "artifact").replace(/[^\w.-]/g, "_");
    return path.join(baseDir, `${hash}-${name}`);
  };

  return {
    async get(key) {
      try {
        const { fs } = await ready;
        return new Uint8Array(await fs.readFile(await fileFor(key)));
      } catch {
        return null;
      }
    },
    async put(key, bytes) {
      try {
        const { fs } = await ready;
        const file = await fileFor(key);
        // Write to a temp file then rename so a concurrent reader never sees a
        // half-written key.
        const tmp = `${file}.tmp-${Math.trunc(performance.now())}-${bytes.byteLength}`;
        await fs.writeFile(tmp, bytes);
        await fs.rename(tmp, file);
      } catch {
        // best-effort
      }
    },
  };
}

/**
 * Pick the platform-appropriate cache: the Cache API where available (browsers,
 * Workers, Deno), else the filesystem on Node. Returns undefined on platforms
 * with neither (e.g. React Native, where a native prover does its own caching)
 * so proving falls back to handing the URL straight to the prover.
 */
export function defaultCircuitKeyCache(): CircuitKeyCache | undefined {
  if (typeof globalThis.caches !== "undefined") return createCacheApiCircuitKeyCache();
  if (isNode) return createFsCircuitKeyCache();
  return undefined;
}

/**
 * Resolve an artifact to bytes via the cache, fetching + storing on a miss.
 *
 * Only remote `http(s)` URLs are cached; local Node paths, `file://`, in-memory
 * buffers, or a missing cache pass straight through to the prover unchanged. Any
 * cache-layer failure (no cache, fetch error, non-2xx) falls back to returning
 * the original URL so the prover can fetch it the usual way — caching is purely
 * additive and never the cause of a failed prove.
 */
export async function loadCircuitKey(
  cache: CircuitKeyCache | undefined,
  artifact: ZKArtifact,
  fetchFn: typeof fetch = fetch,
  integrity?: string,
): Promise<ZKArtifact> {
  if (!cache || typeof artifact !== "string" || !/^https?:\/\//i.test(artifact)) return artifact;

  // Key rotations normally change the artifact URL. Including the metadata
  // digest also makes same-URL rotations safe and avoids serving stale bytes
  // that the Rust integrity gate would correctly reject.
  const cacheKey = integrity
    ? `${artifact}${artifact.includes("?") ? "&" : "?"}__curvy_sha256=${encodeURIComponent(integrity.toLowerCase())}`
    : artifact;
  const hit = await cache.get(cacheKey);
  if (hit) return hit;

  try {
    const res = await fetchFn(artifact);
    if (!res.ok) return artifact;
    const bytes = new Uint8Array(await res.arrayBuffer());
    await cache.put(cacheKey, bytes);
    return bytes;
  } catch {
    return artifact;
  }
}

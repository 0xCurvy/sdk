import { describe, expect, it, vi } from "vitest";
import { type CircuitKeyCache, loadCircuitKey } from "./circuitKeyCache";

/** In-memory cache that records calls, for asserting hit/miss + store behaviour. */
function makeFakeCache(seed: Record<string, Uint8Array> = {}) {
  const store = new Map<string, Uint8Array>(Object.entries(seed));
  return {
    cache: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      put: vi.fn(async (key: string, bytes: Uint8Array) => {
        store.set(key, bytes);
      }),
    } satisfies CircuitKeyCache,
    store,
  };
}

const URL = "https://cdn.example/v2/aggregation/agg_2_3_30.wasm";

describe("loadCircuitKey", () => {
  it("passes the artifact through untouched when no cache is configured", async () => {
    const fetchFn = vi.fn();
    const out = await loadCircuitKey(undefined, URL, fetchFn as unknown as typeof fetch);
    expect(out).toBe(URL);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("passes non-http artifacts (local paths, file://, buffers) through without touching the cache", async () => {
    const { cache } = makeFakeCache();
    const localPath = "/abs/path/agg.zkey";
    expect(await loadCircuitKey(cache, localPath)).toBe(localPath);
    expect(await loadCircuitKey(cache, "file://x/agg.wasm")).toBe("file://x/agg.wasm");
    const buf = new Uint8Array([1, 2, 3]);
    expect(await loadCircuitKey(cache, buf)).toBe(buf);
    expect(cache.get).not.toHaveBeenCalled();
  });

  it("returns cached bytes on a hit without fetching", async () => {
    const bytes = new Uint8Array([9, 8, 7]);
    const { cache } = makeFakeCache({ [URL]: bytes });
    const fetchFn = vi.fn();
    const out = await loadCircuitKey(cache, URL, fetchFn as unknown as typeof fetch);
    expect(out).toBe(bytes);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fetches + stores on a miss, then returns the bytes", async () => {
    const { cache, store } = makeFakeCache();
    const payload = new Uint8Array([1, 2, 3, 4]);
    const fetchFn = vi.fn(async () => new Response(payload as BodyInit, { status: 200 }));
    const out = await loadCircuitKey(cache, URL, fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledWith(URL);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out as Uint8Array)).toEqual([1, 2, 3, 4]);
    // stored for next time
    expect(Array.from(store.get(URL)!)).toEqual([1, 2, 3, 4]);
  });

  it("falls back to the URL when the fetch is non-2xx (never blocks proving on the cache layer)", async () => {
    const { cache } = makeFakeCache();
    const fetchFn = vi.fn(async () => new Response("nope", { status: 404 }));
    const out = await loadCircuitKey(cache, URL, fetchFn as unknown as typeof fetch);
    expect(out).toBe(URL);
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("falls back to the URL when the fetch throws", async () => {
    const { cache } = makeFakeCache();
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const out = await loadCircuitKey(cache, URL, fetchFn as unknown as typeof fetch);
    expect(out).toBe(URL);
  });
});

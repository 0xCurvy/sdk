import { describe, expect, it, vi } from "vitest";
import { lazySingleton } from "./lazySingleton";

describe("lazySingleton", () => {
  it("runs the factory at most once and caches the result", async () => {
    const factory = vi.fn(async () => ({ n: 1 }));
    const get = lazySingleton(factory);

    const a = await get();
    const b = await get();

    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("shares a single in-flight promise for concurrent callers", async () => {
    let resolve!: (v: number) => void;
    const factory = vi.fn(
      () =>
        new Promise<number>((r) => {
          resolve = r;
        }),
    );
    const get = lazySingleton(factory);

    const p1 = get();
    const p2 = get();
    resolve(42);

    expect(await p1).toBe(42);
    expect(await p2).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("retries after a rejection", async () => {
    const factory = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce("ok");
    const get = lazySingleton(factory);

    await expect(get()).rejects.toThrow("fail");
    await expect(get()).resolves.toBe("ok");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("reset() forces the factory to run again", async () => {
    let n = 0;
    const factory = vi.fn(async () => ++n);
    const get = lazySingleton(factory);

    expect(await get()).toBe(1);
    expect(await get()).toBe(1);
    get.reset();
    expect(await get()).toBe(2);
  });
});

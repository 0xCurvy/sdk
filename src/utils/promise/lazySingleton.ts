/**
 * A lazily-initialized async singleton. Calling it runs the factory at most
 * once; concurrent callers share the same in-flight `Promise`. If the factory
 * rejects, the rejection is propagated and the next call retries. Call
 * `.reset()` to drop the cached instance (e.g. to force a WASM reload after a
 * crash).
 */
export type LazySingleton<T> = (() => Promise<T>) & { reset: () => void };

/**
 * Wrap an async `factory` so it is invoked at most once and its result is
 * cached and shared.
 *
 * @example
 * const getCore = lazySingleton(() => loadWasmCore());
 * await getCore(); // runs the factory
 * await getCore(); // returns the cached instance
 * getCore.reset(); // next call re-runs the factory
 */
export function lazySingleton<T>(factory: () => Promise<T>): LazySingleton<T> {
  let instance: T | undefined;
  let inflight: Promise<T> | undefined;

  const get = (() => {
    if (instance !== undefined) return Promise.resolve(instance);
    if (inflight) return inflight;

    inflight = factory().then(
      (result) => {
        instance = result;
        inflight = undefined;
        return result;
      },
      (err) => {
        inflight = undefined;
        throw err;
      },
    );

    return inflight;
  }) as LazySingleton<T>;

  get.reset = () => {
    instance = undefined;
    inflight = undefined;
  };

  return get;
}

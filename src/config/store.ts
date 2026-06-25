/**
 * Minimal, dependency-free reactive store (zustand-style) with selector-based
 * subscriptions. This is the live state container held by a `CurvyConfig`; it
 * replaces the mutable private fields that were scattered across `CurvySDK`,
 * `AccountManager`, and `BalanceScanner`.
 *
 * - `getState()` returns the current snapshot.
 * - `setState(partial | updater)` shallow-merges and notifies subscribers.
 * - `subscribe(selector, listener, opts)` fires `listener` only when the
 *   selected slice changes (by `equalityFn`, default `Object.is`).
 *
 * The `watch*` actions are thin wrappers over `subscribe`.
 */

export type StoreListener<T> = (current: T, previous: T) => void;

export type SubscribeOptions<T> = {
  /** Custom equality; defaults to `Object.is`. */
  equalityFn?: (a: T, b: T) => boolean;
  /** Invoke the listener immediately with the current slice. */
  fireImmediately?: boolean;
};

export type Store<S extends object> = {
  getState: () => S;
  setState: (next: Partial<S> | ((state: S) => Partial<S>)) => void;
  subscribe: <T>(selector: (state: S) => T, listener: StoreListener<T>, options?: SubscribeOptions<T>) => () => void;
  /** Subscribe to every change of the whole state object. */
  subscribeAll: (listener: StoreListener<S>) => () => void;
};

export function createStore<S extends object>(initialState: S): Store<S> {
  let state = initialState;

  type Subscription = { run: (next: S, prev: S) => void };
  const subscriptions = new Set<Subscription>();

  const getState = () => state;

  const setState: Store<S>["setState"] = (next) => {
    const partial = typeof next === "function" ? next(state) : next;
    const previous = state;
    state = { ...state, ...partial };
    for (const subscription of subscriptions) {
      subscription.run(state, previous);
    }
  };

  const subscribe: Store<S>["subscribe"] = (selector, listener, options) => {
    const equalityFn = options?.equalityFn ?? Object.is;
    let lastSlice = selector(state);

    const subscription: Subscription = {
      run: (next) => {
        const nextSlice = selector(next);
        if (equalityFn(nextSlice, lastSlice)) return;
        const previousSlice = lastSlice;
        lastSlice = nextSlice;
        listener(nextSlice, previousSlice);
      },
    };

    subscriptions.add(subscription);
    if (options?.fireImmediately) listener(lastSlice, lastSlice);

    return () => {
      subscriptions.delete(subscription);
    };
  };

  const subscribeAll: Store<S>["subscribeAll"] = (listener) => {
    const subscription: Subscription = { run: (next, prev) => listener(next, prev) };
    subscriptions.add(subscription);
    return () => {
      subscriptions.delete(subscription);
    };
  };

  return { getState, setState, subscribe, subscribeAll };
}

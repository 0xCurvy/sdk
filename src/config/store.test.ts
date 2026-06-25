import { describe, expect, it, vi } from "vitest";
import { createStore } from "./store";

type S = { a: number; b: { x: number }; tag: string };
const initial = (): S => ({ a: 1, b: { x: 1 }, tag: "init" });

describe("createStore", () => {
  it("returns the initial state", () => {
    const store = createStore(initial());
    expect(store.getState()).toEqual({ a: 1, b: { x: 1 }, tag: "init" });
  });

  it("shallow-merges a partial setState, leaving other keys untouched", () => {
    const store = createStore(initial());
    store.setState({ a: 2 });
    expect(store.getState().a).toBe(2);
    expect(store.getState().tag).toBe("init");
  });

  it("supports a functional updater receiving the previous state", () => {
    const store = createStore(initial());
    store.setState((prev) => ({ a: prev.a + 10 }));
    expect(store.getState().a).toBe(11);
  });

  it("notifies a selector subscriber only when its slice changes, with (current, previous)", () => {
    const store = createStore(initial());
    const listener = vi.fn();
    store.subscribe((s) => s.a, listener);

    store.setState({ tag: "changed" }); // `a` unchanged -> no fire
    expect(listener).not.toHaveBeenCalled();

    store.setState({ a: 5 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(5, 1);
  });

  it("honors a custom equalityFn to suppress equal-by-value changes", () => {
    const store = createStore(initial());
    const listener = vi.fn();
    store.subscribe((s) => s.b, listener, { equalityFn: (a, b) => a.x === b.x });

    store.setState({ b: { x: 1 } }); // new object, same x -> treated equal
    expect(listener).not.toHaveBeenCalled();

    store.setState({ b: { x: 2 } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("fireImmediately invokes the listener once up front with the current slice", () => {
    const store = createStore(initial());
    const listener = vi.fn();
    store.subscribe((s) => s.a, listener, { fireImmediately: true });
    expect(listener).toHaveBeenCalledWith(1, 1);
  });

  it("stops notifying after unsubscribe", () => {
    const store = createStore(initial());
    const listener = vi.fn();
    const unsubscribe = store.subscribe((s) => s.a, listener);
    unsubscribe();
    store.setState({ a: 9 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("subscribeAll fires on any state change", () => {
    const store = createStore(initial());
    const listener = vi.fn();
    store.subscribeAll(listener);
    store.setState({ tag: "y" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

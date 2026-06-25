import { describe, expect, it } from "vitest";
import { invariant } from "./invariant";

describe("invariant", () => {
  it("does not throw for truthy conditions", () => {
    expect(() => invariant(1)).not.toThrow();
    expect(() => invariant("x")).not.toThrow();
    expect(() => invariant(true)).not.toThrow();
    expect(() => invariant({})).not.toThrow();
  });

  it("throws a prefixed message for falsy conditions", () => {
    expect(() => invariant(false, "boom")).toThrow("Invariant failed: boom");
    expect(() => invariant(0)).toThrow("Invariant failed");
    expect(() => invariant(null)).toThrow("Invariant failed");
  });

  it("supports a lazy message factory", () => {
    expect(() => invariant(undefined, () => "computed")).toThrow("Invariant failed: computed");
  });

  it("does not evaluate the lazy message when the condition holds", () => {
    let called = false;
    invariant(true, () => {
      called = true;
      return "nope";
    });
    expect(called).toBe(false);
  });

  it("narrows the type after the assertion", () => {
    const value: string | null = "ok" as string | null;
    invariant(value);
    // If this compiles and runs, narrowing to `string` worked.
    expect(value.length).toBe(2);
  });
});

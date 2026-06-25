import { describe, expect, it } from "vitest";
import { type Brand, createBrand } from "./brand";

type SpendKey = Brand<string, "SpendKey">;
const SpendKey = createBrand<"SpendKey">({ label: "spend key", validate: (s) => s.length > 0 });

describe("createBrand", () => {
  it("brands a valid value and returns it unchanged at runtime", () => {
    const raw = "deadbeef";
    const branded: SpendKey = SpendKey(raw);
    // The brand is phantom: identical value at runtime.
    expect(branded).toBe(raw);
  });

  it("throws on invalid input via the constructor", () => {
    expect(() => SpendKey("")).toThrow(/spend key/);
  });

  it("uses a custom onInvalid error when provided", () => {
    class SpendKeyRequiredError extends Error {}
    const Branded = createBrand<"SpendKey">({
      validate: (s) => s.length > 0,
      onInvalid: () => new SpendKeyRequiredError("missing spend key"),
    });
    expect(() => Branded("")).toThrow(SpendKeyRequiredError);
  });

  it("is() acts as a type guard without throwing", () => {
    expect(SpendKey.is("abc")).toBe(true);
    expect(SpendKey.is("")).toBe(false);
  });

  it("assert() narrows or throws", () => {
    expect(() => SpendKey.assert("abc")).not.toThrow();
    expect(() => SpendKey.assert("")).toThrow(/spend key/);
  });

  it("unsafe() brands without validating", () => {
    // The empty string would fail validation, but unsafe skips it.
    expect(SpendKey.unsafe("")).toBe("");
  });

  it("a brand with no validator accepts everything", () => {
    const Anything = createBrand<"Anything">();
    expect(Anything.is("")).toBe(true);
    expect(() => Anything("")).not.toThrow();
  });
});

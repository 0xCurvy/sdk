import { describe, expect, it } from "vitest";
import { SpendKeyRequiredError, ViewKeyRequiredError } from "@/errors";
import { requireSpendKey, requireViewKey, SpendKey, ViewKey } from "./keyBrands";

describe("key brands", () => {
  it("brands a non-empty spend key and returns it unchanged at runtime", () => {
    const raw = "11".padStart(64, "0");
    expect(SpendKey(raw)).toBe(raw);
    expect(SpendKey.is(raw)).toBe(true);
  });

  it("rejects an empty spend key with SpendKeyRequiredError", () => {
    expect(() => SpendKey("")).toThrow(SpendKeyRequiredError);
    expect(SpendKey.is("")).toBe(false);
  });

  it("rejects an empty view key with ViewKeyRequiredError", () => {
    expect(() => ViewKey("")).toThrow(ViewKeyRequiredError);
  });

  it("requireSpendKey extracts s from a keypairs bag", () => {
    const s = "ab".padStart(64, "0");
    expect(requireSpendKey({ s })).toBe(s);
  });

  it("requireSpendKey throws when s is empty (the empty-backfill case)", () => {
    expect(() => requireSpendKey({ s: "" })).toThrow(SpendKeyRequiredError);
  });

  it("requireViewKey extracts v and throws when absent", () => {
    expect(requireViewKey({ v: "cd" })).toBe("cd");
    expect(() => requireViewKey({ v: "" })).toThrow(ViewKeyRequiredError);
  });
});

import { describe, expect, it } from "vitest";
import { hash } from "./hash";

describe("hash", () => {
  it("is deterministic for fixed inputs", () => {
    expect(hash([1n, 2n])).toBe("02ae6da6b482f9b1b19b0b897c3fd43884180a1c5ee361e1107a1bc635649dda");
    expect(hash([1n, 2n])).toBe(hash([1n, 2n]));
  });

  it("is order-sensitive", () => {
    expect(hash([1n, 2n])).not.toBe(hash([2n, 1n]));
    expect(hash([2n, 1n])).toBe("014a3fe82a0219fcc31abd15617966a125f12b0fd3409105fc83b487a9d82de4");
  });

  it("produces a fixed-length 64-char string beginning with 0", () => {
    const out = hash([1n, 2n]);
    // keccak256 -> 64 hex, slice(1) -> 63, padStart(63) -> 63, leading "0" prefix -> 64
    expect(out).toHaveLength(64);
    expect(out.startsWith("0")).toBe(true);
  });
});

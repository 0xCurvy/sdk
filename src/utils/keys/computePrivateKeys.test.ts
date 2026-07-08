import { describe, expect, it } from "vitest";
import { computePrivateKeys } from "./computePrivateKeys";

describe("computePrivateKeys", () => {
  it("derives deterministic spending (s) and viewing (v) keys for fixed r/s", () => {
    const { s, v } = computePrivateKeys("1", "2");
    // s = hash([_s, _r]) = hash([2, 1]); v = hash([_r, _s]) = hash([1, 2])
    expect(s).toBe("014a3fe82a0219fcc31abd15617966a125f12b0fd3409105fc83b487a9d82de4");
    expect(v).toBe("02ae6da6b482f9b1b19b0b897c3fd43884180a1c5ee361e1107a1bc635649dda");
  });

  it("is deterministic across calls", () => {
    expect(computePrivateKeys("1", "2")).toEqual(computePrivateKeys("1", "2"));
  });

  it("yields distinct s and v for distinct r/s (no collision)", () => {
    const { s, v } = computePrivateKeys("1", "2");
    expect(s).not.toBe(v);
  });

  it("is order-sensitive: swapping r and s swaps the keys", () => {
    const a = computePrivateKeys("1", "2");
    const b = computePrivateKeys("2", "1");
    expect(a.s).toBe(b.v);
    expect(a.v).toBe(b.s);
  });

  it("throws when r equals s (s === v collision)", () => {
    expect(() => computePrivateKeys("5", "5")).toThrow(/s === v/);
  });
});

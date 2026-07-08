import { describe, expect, it } from "vitest";
import { generateRandomBigInt, padArray, SNARK_SCALAR_FIELD, serializeJson, sha256BigInt } from "./utils";

describe("serializeJson", () => {
  it("stringifies bigints as decimal strings", () => {
    const out = serializeJson({ a: 42n, b: [1n, 2n], c: "x" });
    expect(JSON.parse(out)).toEqual({ a: "42", b: ["1", "2"], c: "x" });
  });

  it("leaves non-bigint values untouched", () => {
    expect(JSON.parse(serializeJson({ n: 1, s: "s", b: true, z: null }))).toEqual({
      n: 1,
      s: "s",
      b: true,
      z: null,
    });
  });
});

describe("sha256BigInt", () => {
  it("is deterministic for same input", async () => {
    const a = await sha256BigInt([1n, 2n, 3n]);
    const b = await sha256BigInt([1n, 2n, 3n]);
    expect(a).toBe(b);
  });

  it("differs across distinct inputs", async () => {
    const a = await sha256BigInt([1n, 2n]);
    const b = await sha256BigInt([1n, 3n]);
    expect(a).not.toBe(b);
  });

  it("packs each input as 32 big-endian bytes (independent re-computation matches)", async () => {
    const inputs = [1n, (1n << 64n) | 5n];
    const buf = new Uint8Array(inputs.length * 32);
    inputs.forEach((v, idx) => {
      let x = v;
      for (let i = 31; i >= 0; i--) {
        buf[idx * 32 + i] = Number(x & 0xffn);
        x >>= 8n;
      }
    });
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
    const hex = Array.from(digest)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(await sha256BigInt(inputs)).toBe(BigInt(`0x${hex}`));
  });

  it("handles 256-bit values across all four 64-bit limbs", async () => {
    const big = (1n << 200n) | (1n << 100n) | 7n;
    const a = await sha256BigInt([big]);
    const b = await sha256BigInt([big + 1n]);
    expect(a).not.toBe(b);
  });
});

describe("padArray", () => {
  it("appends element until length reached", () => {
    expect(padArray([1, 2], 5, 0)).toEqual([1, 2, 0, 0, 0]);
  });

  it("leaves array unchanged if already at length", () => {
    expect(padArray([1, 2, 3], 3, 9)).toEqual([1, 2, 3]);
  });

  it("does not truncate when longer than target", () => {
    expect(padArray([1, 2, 3, 4], 2, 0)).toEqual([1, 2, 3, 4]);
  });

  it("returns a new array and leaves the input untouched", () => {
    const a: number[] = [];
    const r = padArray(a, 3, 1);
    expect(r).not.toBe(a);
    expect(a).toEqual([]);
    expect(r).toEqual([1, 1, 1]);
  });
});

describe("generateRandomBigInt", () => {
  it("returns a bigint within the requested byte width", () => {
    const v = generateRandomBigInt(4);
    expect(typeof v).toBe("bigint");
    expect(v).toBeGreaterThanOrEqual(0n);
    expect(v).toBeLessThan(1n << 32n);
  });

  it("default 31 bytes stays below 2^248", () => {
    const v = generateRandomBigInt();
    expect(v).toBeLessThan(1n << 248n);
  });

  it("produces distinct values across calls", () => {
    const a = generateRandomBigInt();
    const b = generateRandomBigInt();
    expect(a).not.toBe(b);
  });
});

describe("SNARK_SCALAR_FIELD re-export", () => {
  it("is the BN254 scalar field prime", () => {
    expect(SNARK_SCALAR_FIELD).toBe(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
  });
});
